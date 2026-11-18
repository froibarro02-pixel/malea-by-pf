
"use strict";

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let db;

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================

function initializeFirebase() {
    if (db) return db;

    const encodedServiceAccount =
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!encodedServiceAccount) {
        throw new Error("Firebase service account is missing.");
    }

    const serviceAccount = JSON.parse(
        Buffer.from(encodedServiceAccount, "base64").toString("utf8")
    );

    if (serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID) {
        throw new Error("Firebase project ID does not match.");
    }

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }

    db = getFirestore();

    return db;
}

// ==========================================
// RESPONSE HELPER
// ==========================================

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify(body)
    };
}

// ==========================================
// DATE VALIDATION
// ==========================================

function validDate(value) {
    if (typeof value !== "string") return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

// ==========================================
// MAIN NETLIFY FUNCTION
// ==========================================

exports.handler = async function (event) {

    // Handle browser preflight requests
    if (event.httpMethod === "OPTIONS") {
        return response(200, {
            success: true
        });
    }

    // Only accept POST requests
    if (event.httpMethod !== "POST") {
        return response(405, {
            success: false,
            message: "Method not allowed."
        });
    }

    try {

        const database = initializeFirebase();

        // ======================================
        // READ REQUEST DATA
        // ======================================

        let input;

        try {
            input = JSON.parse(event.body || "{}");
        } catch {
            return response(400, {
                success: false,
                message: "Invalid request data."
            });
        }

        const dressId = String(input.dressId || "").trim();
        const customerName = String(input.customerName || "").trim();
        const customerPhone = String(input.customerPhone || "").trim();
        const customerEmail = String(input.customerEmail || "").trim();
        const pickupDate = String(input.pickupDate || "").trim();
        const returnDate = String(input.returnDate || "").trim();
        const notes = String(input.notes || "").trim();

        // ======================================
        // REQUIRED FIELD VALIDATION
        // ======================================

        if (
            !dressId ||
            !customerName ||
            !customerPhone ||
            !validDate(pickupDate) ||
            !validDate(returnDate)
        ) {
            return response(400, {
                success: false,
                message: "Please provide valid customer details and rental dates."
            });
        }

        if (returnDate < pickupDate) {
            return response(400, {
                success: false,
                message: "Return date must be on or after pickup date."
            });
        }

        // Philippine local date
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila"
        });

        if (pickupDate < today) {
            return response(400, {
                success: false,
                message: "Pickup date cannot be in the past."
            });
        }

        // ======================================
        // INPUT LENGTH VALIDATION
        // ======================================

        if (
            customerName.length > 120 ||
            customerPhone.length > 40 ||
            customerEmail.length > 160 ||
            notes.length > 1000
        ) {
            return response(400, {
                success: false,
                message: "Some submitted information is too long."
            });
        }

        // ======================================
        // FIRESTORE REFERENCES
        // ======================================

        const dressRef = database
            .collection("dresses")
            .doc(dressId);

        const reservationsRef = database
            .collection("reservations");

        // Lock document prevents simultaneous customer bookings
        // for the same dress from passing the conflict check.
        const lockRef = database
            .collection("_reservationLocks")
            .doc(dressId);

        const reservationRef = reservationsRef.doc();

        // Reservation ID counter for the current Philippine date
        const reservationDate = today;
        const compactDate = reservationDate.replace(/-/g, "");

        const counterRef = database
            .collection("_reservationCounters")
            .doc(compactDate);

        // ======================================
        // RESERVATION TRANSACTION
        // ======================================

        const result = await database.runTransaction(
            async (transaction) => {

                // Read lock first
                await transaction.get(lockRef);

                // Check if dress exists
                const dressSnapshot = await transaction.get(dressRef);

                if (!dressSnapshot.exists) {
                    const error = new Error("Dress not found.");
                    error.statusCode = 404;
                    throw error;
                }

                const dress = dressSnapshot.data() || {};

                const availability = String(
                    dress.availability || dress.status || "Available"
                ).toLowerCase();

                if (
                    availability === "unavailable" ||
                    availability === "borrowed" ||
                    availability === "rented"
                ) {
                    const error = new Error(
                        "This dress is currently unavailable."
                    );

                    error.statusCode = 409;
                    throw error;
                }

                // ==================================
                // CHECK EXISTING RESERVATIONS
                // ==================================

                const existingQuery = reservationsRef.where(
                    "dressId",
                    "==",
                    dressId
                );

                const existingSnapshot = await transaction.get(
                    existingQuery
                );

                const conflict = existingSnapshot.docs.some((doc) => {

                    const reservation = doc.data() || {};

                    const status = String(
                        reservation.status || "Pending"
                    ).toLowerCase();

                    // Only Pending and Confirmed block dates
                    const blocksDates =
                        status === "pending" ||
                        status === "confirmed";

                    if (!blocksDates) {
                        return false;
                    }

                    const existingPickup = String(
                        reservation.pickupDate || ""
                    );

                    const existingReturn = String(
                        reservation.returnDate || ""
                    );

                    // Inclusive date overlap
                    // Same-day handover is considered a conflict.
                    return (
                        existingPickup <= returnDate &&
                        existingReturn >= pickupDate
                    );
                });

                if (conflict) {
                    const error = new Error(
                        "Those dates are already requested or reserved. Please choose different dates."
                    );

                    error.statusCode = 409;
                    throw error;
                }

                // ==================================
                // GENERATE RESERVATION ID
                // ==================================

                const counterSnapshot = await transaction.get(
                    counterRef
                );

                const previousCount = counterSnapshot.exists
                    ? Number(counterSnapshot.data().count || 0)
                    : 0;

                const nextCount = previousCount + 1;

                const reservationId =
                    `MPF-${compactDate}-${String(nextCount).padStart(3, "0")}`;

                // ==================================
                // PREPARE RESERVATION DATA
                // ==================================

                const now = new Date().toISOString();

                const rentalPrice = Number(
                    dress.price ?? dress.rentalPrice ?? 0
                );

                const reservation = {
                    reservationId,

                    customerName,
                    contact: customerPhone,
                    customerEmail,

                    dressId,

                    dressName: String(
                        dress.name || dress.dressName || "Dress"
                    ),
                    dressCode: String(
                        dress.dressCode || dress.code || dress.dressCodeNumber || dressId
                    ),
                    dressSize: String(dress.size || "Not specified"),
                    dressColor: String(dress.color || "Not specified"),

                    reservationDate,
                    pickupDate,
                    returnDate,

                    rentalPrice: Number.isFinite(rentalPrice)
                        ? rentalPrice
                        : 0,

                    deposit: 0,

                    paymentStatus: "Unpaid",
                    status: "Pending",

                    notes,

                    createdAt: now,
                    updatedAt: now
                };

                // ==================================
                // SAVE RESERVATION
                // ==================================

                transaction.set(
                    reservationRef,
                    reservation
                );

                // Update daily reservation counter
                transaction.set(counterRef, {
                    count: nextCount,
                    updatedAt: now
                });

                // Update per-dress lock
                transaction.set(lockRef, {
                    lastReservationAt: now
                });

                return {
                    reservationId,
                    dressName: reservation.dressName,
                    dressCode: reservation.dressCode,
                    dressSize: reservation.dressSize,
                    dressColor: reservation.dressColor
                };
            }
        );

        // ======================================
        // SUCCESS RESPONSE
        // ======================================

        return response(200, {
            success: true,
            message: "Reservation request submitted successfully.",
            reservationId: result.reservationId,
            reservationDate: today,
            dressName: result.dressName,
            dressCode: result.dressCode,
            dressSize: result.dressSize,
            dressColor: result.dressColor
        });

    } catch (error) {

        console.error(
            "Reservation function error:",
            error
        );

        if (error.statusCode === 409) {
            return response(409, {
                success: false,
                message: error.message
            });
        }

        if (error.statusCode === 404) {
            return response(404, {
                success: false,
                message: error.message
            });
        }

        return response(500, {
            success: false,
            message: "Unable to submit your reservation right now. Please try again later."
        });
    }
};
