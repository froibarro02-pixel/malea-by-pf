
"use strict";

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
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
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify(body)
    };
}

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// ==========================================
// MAIN NETLIFY FUNCTION
// ==========================================

exports.handler = async function (event) {

    // Browser preflight
    if (event.httpMethod === "OPTIONS") {
        return response(200, {
            success: true
        });
    }

    // POST only
    if (event.httpMethod !== "POST") {
        return response(405, {
            success: false,
            message: "Method not allowed."
        });
    }

    try {

        // ======================================
        // AUTHENTICATION
        // ======================================

        const authorization =
            event.headers.authorization ||
            event.headers.Authorization ||
            "";

        const match = authorization.match(/^Bearer\s+(.+)$/i);

        if (!match) {
            throw httpError(401, "Authentication is required.");
        }

        const database = initializeFirebase();

        const decodedToken = await getAuth().verifyIdToken(match[1]);

        // ======================================
        // ADMIN AUTHORIZATION
        // ======================================

        const allowedUids = (
            process.env.FIREBASE_ADMIN_UIDS || ""
        )
            .split(",")
            .map(value => value.trim())
            .filter(Boolean);

        if (
            !allowedUids.length ||
            !allowedUids.includes(decodedToken.uid)
        ) {
            throw httpError(
                403,
                "You are not authorized to manage reservations."
            );
        }

        // ======================================
        // READ REQUEST DATA
        // ======================================

        let input;

        try {
            input = JSON.parse(event.body || "{}");
        } catch {
            throw httpError(400, "Invalid request data.");
        }

        const reservationDocumentId =
            String(input.reservationId || "").trim();

        const action =
            String(input.action || "").trim().toLowerCase();

        if (
            !reservationDocumentId ||
            !["confirm", "reject"].includes(action)
        ) {
            throw httpError(
                400,
                "A valid reservation ID and action are required."
            );
        }

        // ======================================
        // FIRESTORE REFERENCES
        // ======================================

        const reservationsRef =
            database.collection("reservations");

        const reservationRef =
            reservationsRef.doc(reservationDocumentId);

        const now = new Date().toISOString();

        // ======================================
        // RESERVATION TRANSACTION
        // ======================================

        const result = await database.runTransaction(
            async transaction => {

                const reservationSnapshot =
                    await transaction.get(reservationRef);

                if (!reservationSnapshot.exists) {
                    throw httpError(404, "Reservation not found.");
                }

                const reservation =
                    reservationSnapshot.data() || {};

                const currentStatus =
                    String(
                        reservation.status || "Pending"
                    ).toLowerCase();

                // Only Pending reservations can be processed
                if (currentStatus !== "pending") {
                    throw httpError(
                        409,
                        `This reservation is already ${
                            reservation.status || "processed"
                        }.`
                    );
                }

                // ==================================
                // CONFIRM RESERVATION
                // ==================================

                if (action === "confirm") {

                    const dressId =
                        String(reservation.dressId || "").trim();

                    const pickupDate =
                        String(reservation.pickupDate || "").trim();

                    const returnDate =
                        String(reservation.returnDate || "").trim();

                    if (
                        !dressId ||
                        !pickupDate ||
                        !returnDate
                    ) {
                        throw httpError(
                            400,
                            "Reservation is missing its dress or rental dates."
                        );
                    }

                    // Same per-dress lock used by customer bookings
                    const lockRef = database
                        .collection("_reservationLocks")
                        .doc(dressId);

                    await transaction.get(lockRef);

                    // Check existing reservations
                    const existingQuery = reservationsRef.where(
                        "dressId",
                        "==",
                        dressId
                    );

                    const existingSnapshot =
                        await transaction.get(existingQuery);

                    const conflict = existingSnapshot.docs.some(doc => {

                        // Ignore the current reservation
                        if (doc.id === reservationDocumentId) {
                            return false;
                        }

                        const existing = doc.data() || {};

                        const status = String(
                            existing.status || "Pending"
                        ).toLowerCase();

                        // Only Pending and Confirmed block dates
                        if (
                            status !== "pending" &&
                            status !== "confirmed"
                        ) {
                            return false;
                        }

                        const existingPickup =
                            String(existing.pickupDate || "");

                        const existingReturn =
                            String(existing.returnDate || "");

                        // Inclusive date overlap
                        // Same-day handover is a conflict
                        return (
                            existingPickup <= returnDate &&
                            existingReturn >= pickupDate
                        );
                    });

                    if (conflict) {
                        throw httpError(
                            409,
                            "These dates conflict with another pending or confirmed reservation. This request cannot be confirmed."
                        );
                    }

                    // Update reservation
                    transaction.update(reservationRef, {
                        status: "Confirmed",
                        confirmedAt: now,
                        confirmedBy: decodedToken.uid,
                        updatedAt: now
                    });

                    transaction.set(
                        lockRef,
                        {
                            lastReservationAt: now,
                            lastAdminActionAt: now
                        },
                        { merge: true }
                    );

                    return {
                        status: "Confirmed"
                    };
                }

                // ==================================
                // REJECT RESERVATION
                // ==================================

                transaction.update(reservationRef, {
                    status: "Rejected",
                    rejectedAt: now,
                    rejectedBy: decodedToken.uid,
                    updatedAt: now
                });

                return {
                    status: "Rejected"
                };
            }
        );

        // ======================================
        // SUCCESS RESPONSE
        // ======================================

        return response(200, {
            success: true,
            message:
                `Reservation ${result.status.toLowerCase()} successfully.`,
            status: result.status
        });

    } catch (error) {

        console.error(
            "Update reservation function error:",
            error
        );

        const statusCode =
            Number(error.statusCode) || 500;

        return response(statusCode, {
            success: false,
            message: statusCode === 500
                ? "Unable to update this reservation right now."
                : error.message
        });
    }
};
