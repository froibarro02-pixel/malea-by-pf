// ======================================================
// MALÉA BY PF
// ADMIN PANEL
// INVENTORY + AVAILABILITY STATUS
// ======================================================


// ======================================================
// FIREBASE
// ======================================================

let auth = null;
let firebaseApp = null;

const PROJECT_ID = "malea-by-pf";

const FIRESTORE_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/dresses`;


// ======================================================
// DRESS DATA
// ======================================================

let dresses = [];


// ======================================================
// STATUS DEFINITIONS
// ======================================================

const VALID_STATUSES = [
    "Available",
    "Reserved",
    "Borrowed",
    "Unavailable"
];


// ======================================================
// DOM
// ======================================================

let inventoryGrid;
let emptyState;

let searchInput;
let categoryFilter;
let availabilityFilter;

let dressModal;
let dressForm;

let dressId;
let dressName;
let dressCategory;
let dressSize;
let dressPrice;
let dressAvailability;
let dressColor;
let dressPhoto;
let photoPreview;
let dressNotes;

let modalTitle;
let saveDressButton;


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

function initializeFirebase() {

    try {

        if (typeof firebase === "undefined") {

            throw new Error(
                "Firebase library was not loaded."
            );
        }


        if (
            typeof window.firebaseConfig === "undefined" ||
            !window.firebaseConfig
        ) {

            throw new Error(
                "Firebase configuration was not found."
            );
        }


        if (firebase.apps.length > 0) {

            firebaseApp = firebase.app();

        } else {

            firebaseApp =
                firebase.initializeApp(
                    window.firebaseConfig
                );

        }


        auth = firebaseApp.auth();


        console.log(
            "Firebase initialized successfully."
        );


        return true;

    } catch (error) {

        console.error(
            "Firebase initialization error:",
            error
        );


        showFirebaseInitializationError(
            error.message
        );


        return false;
    }
}


// ======================================================
// FIREBASE ERROR
// ======================================================

function showFirebaseInitializationError(message) {

    setTimeout(() => {

        const loginScreen =
            document.getElementById(
                "adminLoginScreen"
            );

        if (!loginScreen) {
            return;
        }


        loginScreen.innerHTML = `

            <div class="admin-login-card">

                <div class="admin-login-brand">

                    <div class="admin-login-brand-mark">
                        M
                    </div>

                    <h1>Maléa by PF</h1>

                    <p>Admin Panel</p>

                </div>

                <div
                    class="admin-login-error visible"
                    style="display:block"
                >
                    Firebase could not initialize.
                    <br><br>
                    ${escapeHTML(message)}
                </div>

            </div>
        `;


        loginScreen.classList.add("visible");

    }, 100);
}


// ======================================================
// LOGIN SCREEN
// ======================================================

function createLoginScreen() {

    const loginScreen =
        document.getElementById(
            "adminLoginScreen"
        );

    if (!loginScreen) {
        return;
    }


    loginScreen.innerHTML = `

        <div class="admin-login-card">

            <div class="admin-login-brand">

                <div class="admin-login-brand-mark">
                    M
                </div>

                <h1>Maléa by PF</h1>

                <p>Admin Panel</p>

            </div>


            <form id="adminLoginForm">

                <div
                    class="admin-login-error"
                    id="adminLoginError"
                ></div>


                <div class="admin-login-field">

                    <label for="adminEmail">
                        Email
                    </label>

                    <input
                        type="email"
                        id="adminEmail"
                        autocomplete="username"
                        required
                        placeholder="Admin email"
                    >

                </div>


                <div class="admin-login-field">

                    <label for="adminPassword">
                        Password
                    </label>

                    <input
                        type="password"
                        id="adminPassword"
                        autocomplete="current-password"
                        required
                        placeholder="Password"
                    >

                </div>


                <button
                    type="submit"
                    class="admin-login-button"
                    id="adminLoginButton"
                >
                    Login
                </button>

            </form>

        </div>
    `;


    loginScreen.classList.add("visible");


    const form =
        document.getElementById(
            "adminLoginForm"
        );


    form.addEventListener(
        "submit",
        handleAdminLogin
    );
}


// ======================================================
// LOGIN
// ======================================================

async function handleAdminLogin(event) {

    event.preventDefault();


    if (!auth) {

        showLoginError(
            "Firebase Authentication is not available."
        );

        return;
    }


    const email =
        document.getElementById(
            "adminEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "adminPassword"
        ).value;


    const button =
        document.getElementById(
            "adminLoginButton"
        );


    button.disabled = true;

    button.textContent = "Signing in...";


    hideLoginError();


    try {

        await auth.signInWithEmailAndPassword(
            email,
            password
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        let message =
            "Unable to sign in. Please check your email and password.";


        if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No admin account was found with this email.";

        } else if (
            error.code ===
            "auth/wrong-password"
        ) {

            message =
                "Incorrect password.";

        } else if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid email or password.";

        } else if (
            error.code ===
            "auth/operation-not-allowed"
        ) {

            message =
                "Email/password authentication is not enabled in Firebase.";

        } else if (
            error.code ===
            "auth/unauthorized-domain"
        ) {

            message =
                "This website domain is not authorized in Firebase.";

        }


        showLoginError(message);


        button.disabled = false;

        button.textContent = "Login";
    }
}


// ======================================================
// LOGIN ERROR
// ======================================================

function showLoginError(message) {

    const errorBox =
        document.getElementById(
            "adminLoginError"
        );


    if (!errorBox) {
        return;
    }


    errorBox.textContent = message;

    errorBox.classList.add("visible");
}


function hideLoginError() {

    const errorBox =
        document.getElementById(
            "adminLoginError"
        );


    if (!errorBox) {
        return;
    }


    errorBox.textContent = "";

    errorBox.classList.remove(
        "visible"
    );
}


// ======================================================
// LOGOUT
// ======================================================

async function logoutAdmin() {

    if (!auth) {
        return;
    }


    try {

        await auth.signOut();

        console.log(
            "Admin logged out."
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }
}


function setupLogoutButton() {

    const button =
        document.getElementById(
            "logoutButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        logoutAdmin
    );
}


// ======================================================
// AUTH STATE
// ======================================================

function startAuthentication() {

    if (!auth) {
        return;
    }


    auth.onAuthStateChanged(
        async (user) => {

            const loginScreen =
                document.getElementById(
                    "adminLoginScreen"
                );


            const app =
                document.getElementById(
                    "adminApp"
                );


            if (user) {

                console.log(
                    "Admin authenticated:",
                    user.email
                );


                if (loginScreen) {

                    loginScreen.classList.remove(
                        "visible"
                    );
                }


                if (app) {

                    app.style.display = "flex";
                }


                await initializeApplication();


            } else {

                dresses = [];


                if (app) {

                    app.style.display = "none";
                }


                createLoginScreen();
            }

        }
    );
}


// ======================================================
// INITIALIZE APP
// ======================================================

async function initializeApplication() {

    cacheDOM();

    setupNavigation();

    setupModal();

    setupInventoryControls();

    setupLogoutButton();

    await loadDresses();
}


// ======================================================
// CACHE DOM
// ======================================================

function cacheDOM() {

    inventoryGrid =
        document.getElementById(
            "inventoryGrid"
        );


    emptyState =
        document.getElementById(
            "emptyState"
        );


    searchInput =
        document.getElementById(
            "searchInput"
        );


    categoryFilter =
        document.getElementById(
            "categoryFilter"
        );


    availabilityFilter =
        document.getElementById(
            "availabilityFilter"
        );


    dressModal =
        document.getElementById(
            "dressModal"
        );


    dressForm =
        document.getElementById(
            "dressForm"
        );


    dressId =
        document.getElementById(
            "dressId"
        );


    dressName =
        document.getElementById(
            "dressName"
        );


    dressCategory =
        document.getElementById(
            "dressCategory"
        );


    dressSize =
        document.getElementById(
            "dressSize"
        );


    dressPrice =
        document.getElementById(
            "dressPrice"
        );


    dressAvailability =
        document.getElementById(
            "dressAvailability"
        );


    dressColor =
        document.getElementById(
            "dressColor"
        );


    dressPhoto =
        document.getElementById(
            "dressPhoto"
        );


    photoPreview =
        document.getElementById(
            "photoPreview"
        );


    dressNotes =
        document.getElementById(
            "dressNotes"
        );


    modalTitle =
        document.getElementById(
            "modalTitle"
        );


    saveDressButton =
        document.getElementById(
            "saveDressButton"
        );
}


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        (item) => {

            item.addEventListener(
                "click",
                () => {

                    const sectionId =
                        item.dataset.section;


                    showSection(
                        sectionId
                    );


                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            nav => {
                                nav.classList.remove(
                                    "active"
                                );
                            }
                        );


                    item.classList.add(
                        "active"
                    );


                    const sidebar =
                        document.getElementById(
                            "sidebar"
                        );


                    if (sidebar) {

                        sidebar.classList.remove(
                            "open"
                        );
                    }

                }
            );

        }
    );


    const mobileMenuButton =
        document.getElementById(
            "mobileMenuButton"
        );


    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            () => {

                const sidebar =
                    document.getElementById(
                        "sidebar"
                    );


                if (sidebar) {

                    sidebar.classList.toggle(
                        "open"
                    );
                }

            }
        );
    }
}


// ======================================================
// SHOW SECTION
// ======================================================

function showSection(sectionId) {

    document
        .querySelectorAll(".section")
        .forEach(
            section => {

                section.classList.remove(
                    "active-section"
                );

            }
        );


    const section =
        document.getElementById(
            sectionId
        );


    if (section) {

        section.classList.add(
            "active-section"
        );
    }


    const titleMap = {

        dashboardSection: [
            "Dashboard",
            "Overview of your dress rental inventory"
        ],

        inventorySection: [
            "Dress Inventory",
            "Manage your dresses and availability"
        ],

        reservationsSection: [
            "Reservations",
            "Manage upcoming and active bookings"
        ],

        customersSection: [
            "Customers",
            "Customer information"
        ],

        calendarSection: [
            "Rental Calendar",
            "Rental schedule"
        ],

        paymentsSection: [
            "Payments",
            "Payment monitoring"
        ],

        reportsSection: [
            "Reports",
            "Business reports"
        ],

        settingsSection: [
            "Settings",
            "Admin settings"
        ]

    };


    const values =
        titleMap[sectionId];


    if (values) {

        document.getElementById(
            "pageTitle"
        ).textContent = values[0];


        document.getElementById(
            "pageSubtitle"
        ).textContent = values[1];
    }
}


// ======================================================
// MODAL
// ======================================================

function setupModal() {

    document
        .getElementById(
            "addDressButton"
        )
        ?.addEventListener(
            "click",
            () => openAddDressModal()
        );


    document
        .getElementById(
            "dashboardAddDressButton"
        )
        ?.addEventListener(
            "click",
            () => openAddDressModal()
        );


    document
        .getElementById(
            "emptyAddDressButton"
        )
        ?.addEventListener(
            "click",
            () => openAddDressModal()
        );


    document
        .getElementById(
            "closeModalButton"
        )
        ?.addEventListener(
            "click",
            closeDressModal
        );


    document
        .getElementById(
            "cancelModalButton"
        )
        ?.addEventListener(
            "click",
            closeDressModal
        );


    document
        .getElementById(
            "modalOverlay"
        )
        ?.addEventListener(
            "click",
            closeDressModal
        );


    dressForm?.addEventListener(
        "submit",
        saveDress
    );


    dressPhoto?.addEventListener(
        "change",
        previewPhoto
    );
}


// ======================================================
// OPEN ADD
// ======================================================

function openAddDressModal() {

    if (!dressModal) {
        return;
    }


    dressForm.reset();


    dressId.value = "";


    dressAvailability.value =
        "Available";


    modalTitle.textContent =
        "Add Dress";


    saveDressButton.textContent =
        "Save Dress";


    photoPreview.innerHTML = "";

    photoPreview.classList.remove(
        "visible"
    );


    dressModal.classList.add(
        "active"
    );
}


// ======================================================
// OPEN EDIT
// ======================================================

function openEditDressModal(id) {

    const dress =
        dresses.find(
            item => item.id === id
        );


    if (!dress) {
        return;
    }


    dressId.value =
        dress.id || "";


    dressName.value =
        dress.name || "";


    dressCategory.value =
        dress.category || "";


    dressSize.value =
        dress.size || "";


    dressPrice.value =
        dress.price || "";


    dressColor.value =
        dress.color || "";


    dressNotes.value =
        dress.notes || "";


    dressAvailability.value =
        normalizeStatus(
            dress.availability
        );


    photoPreview.innerHTML = "";


    if (dress.photo) {

        photoPreview.innerHTML = `
            <img
                src="${dress.photo}"
                alt="Dress preview"
            >
        `;

        photoPreview.classList.add(
            "visible"
        );

    } else {

        photoPreview.classList.remove(
            "visible"
        );
    }


    modalTitle.textContent =
        "Edit Dress";


    saveDressButton.textContent =
        "Save Changes";


    dressModal.classList.add(
        "active"
    );
}


// ======================================================
// CLOSE MODAL
// ======================================================

function closeDressModal() {

    if (!dressModal) {
        return;
    }


    dressModal.classList.remove(
        "active"
    );
}


// ======================================================
// PHOTO PREVIEW
// ======================================================

function previewPhoto(event) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload = function(e) {

        photoPreview.innerHTML = `
            <img
                src="${e.target.result}"
                alt="Dress preview"
            >
        `;


        photoPreview.classList.add(
            "visible"
        );

    };


    reader.readAsDataURL(file);
}


// ======================================================
// SAVE DRESS
// ======================================================

async function saveDress(event) {

    event.preventDefault();


    if (!auth || !auth.currentUser) {

        alert(
            "Please log in again."
        );

        return;
    }


    const name =
        dressName.value.trim();


    const category =
        dressCategory.value.trim();


    if (!name || !category) {

        alert(
            "Please enter the dress name and category."
        );

        return;
    }


    let status =
        normalizeStatus(
            dressAvailability.value
        );


    const id =
        dressId.value.trim();


    const existingDress =
        dresses.find(
            item => item.id === id
        );


    let photo =
        existingDress?.photo || "";


    if (
        dressPhoto.files &&
        dressPhoto.files.length > 0
    ) {

        try {

            photo =
                await compressImage(
                    dressPhoto.files[0]
                );

        } catch (error) {

            console.error(
                "Photo processing error:",
                error
            );

            alert(
                "Unable to process the photo."
            );

            return;
        }
    }


    const dressData = {

        name: name,

        category: category,

        size:
            dressSize.value.trim(),

        price:
            Number(
                dressPrice.value
            ) || 0,

        availability: status,

        color:
            dressColor.value.trim(),

        photo: photo,

        notes:
            dressNotes.value.trim(),

        updatedAt:
            new Date().toISOString()

    };


    saveDressButton.disabled =
        true;


    saveDressButton.textContent =
        "Saving...";


    try {

        const token =
            await auth.currentUser.getIdToken();


        if (id) {

            // =========================
            // UPDATE
            // =========================

            const response =
                await fetch(
                    `${FIRESTORE_URL}/${encodeURIComponent(id)}?updateMask.fieldPaths=name&updateMask.fieldPaths=category&updateMask.fieldPaths=size&updateMask.fieldPaths=price&updateMask.fieldPaths=availability&updateMask.fieldPaths=color&updateMask.fieldPaths=photo&updateMask.fieldPaths=notes&updateMask.fieldPaths=updatedAt`,
                    {
                        method: "PATCH",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                fields:
                                    firestoreFields(
                                        dressData
                                    )
                            })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }


        } else {

            // =========================
            // CREATE
            // =========================

            const response =
                await fetch(
                    FIRESTORE_URL,
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                fields:
                                    firestoreFields(
                                        dressData
                                    )
                            })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }

        }


        closeDressModal();

        await loadDresses();


    } catch (error) {

        console.error(
            "Save dress error:",
            error
        );


        alert(
            "Unable to save the dress. Please try again."
        );


    } finally {

        saveDressButton.disabled =
            false;

        saveDressButton.textContent =
            id
                ? "Save Changes"
                : "Save Dress";
    }
}


// ======================================================
// DELETE DRESS
// ======================================================

async function deleteDress(id) {

    const dress =
        dresses.find(
            item => item.id === id
        );


    if (!dress) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${dress.name}" from the inventory?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const token =
            await auth.currentUser.getIdToken();


        const response =
            await fetch(
                `${FIRESTORE_URL}/${encodeURIComponent(id)}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        await loadDresses();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Unable to delete the dress."
        );
    }
}


// ======================================================
// LOAD DRESSES
// ======================================================

async function loadDresses() {

    if (
        !auth ||
        !auth.currentUser
    ) {
        return;
    }


    try {

        const token =
            await auth.currentUser.getIdToken();


        const response =
            await fetch(
                FIRESTORE_URL,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const data =
            await response.json();


        const documents =
            data.documents || [];


        dresses =
            documents.map(
                convertFirestoreDocument
            );


        renderCategoryFilter();

        renderInventory();

        updateDashboardStats();


    } catch (error) {

        console.error(
            "Load dresses error:",
            error
        );


        dresses = [];


        renderInventory();

        updateDashboardStats();
    }
}


// ======================================================
// CONVERT FIRESTORE DOCUMENT
// ======================================================

function convertFirestoreDocument(document) {

    const fields =
        document.fields || {};


    const documentName =
        document.name || "";


    const id =
        documentName
            .split("/")
            .pop();


    return {

        id: id,

        name:
            firestoreToJS(
                fields.name
            ) || "",

        category:
            firestoreToJS(
                fields.category
            ) || "",

        size:
            firestoreToJS(
                fields.size
            ) || "",

        price:
            Number(
                firestoreToJS(
                    fields.price
                )
            ) || 0,

        availability:
            normalizeStatus(
                firestoreToJS(
                    fields.availability
                )
            ),

        color:
            firestoreToJS(
                fields.color
            ) || "",

        photo:
            firestoreToJS(
                fields.photo
            ) || "",

        notes:
            firestoreToJS(
                fields.notes
            ) || "",

        updatedAt:
            firestoreToJS(
                fields.updatedAt
            ) || ""

    };
}


// ======================================================
// FIRESTORE → JAVASCRIPT
// ======================================================

function firestoreToJS(value) {

    if (!value) {
        return null;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            value,
            "stringValue"
        )
    ) {

        return value.stringValue;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            value,
            "integerValue"
        )
    ) {

        return Number(
            value.integerValue
        );
    }


    if (
        Object.prototype.hasOwnProperty.call(
            value,
            "doubleValue"
        )
    ) {

        return Number(
            value.doubleValue
        );
    }


    if (
        Object.prototype.hasOwnProperty.call(
            value,
            "booleanValue"
        )
    ) {

        return value.booleanValue;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            value,
            "timestampValue"
        )
    ) {

        return value.timestampValue;
    }


    return null;
}


// ======================================================
// JAVASCRIPT → FIRESTORE
// ======================================================

function firestoreFields(data) {

    return {

        name: {
            stringValue:
                data.name
        },

        category: {
            stringValue:
                data.category
        },

        size: {
            stringValue:
                data.size || ""
        },

        price: {
            doubleValue:
                Number(data.price) || 0
        },

        availability: {
            stringValue:
                normalizeStatus(
                    data.availability
                )
        },

        color: {
            stringValue:
                data.color || ""
        },

        photo: {
            stringValue:
                data.photo || ""
        },

        notes: {
            stringValue:
                data.notes || ""
        },

        updatedAt: {
            stringValue:
                data.updatedAt
        }

    };
}


// ======================================================
// STATUS NORMALIZATION
// ======================================================

function normalizeStatus(status) {

    if (!status) {
        return "Available";
    }


    const value =
        String(status)
            .trim()
            .toLowerCase();


    if (value === "available") {
        return "Available";
    }


    if (value === "reserved") {
        return "Reserved";
    }


    // Convert old Rented status
    if (
        value === "rented" ||
        value === "borrowed"
    ) {

        return "Borrowed";
    }


    // Convert old Maintenance status
    if (
        value === "maintenance" ||
        value === "unavailable"
    ) {

        return "Unavailable";
    }


    return "Available";
}


// ======================================================
// RENDER INVENTORY
// ======================================================

function renderInventory() {

    if (!inventoryGrid) {
        return;
    }


    const search =
        searchInput?.value
            .trim()
            .toLowerCase() || "";


    const category =
        categoryFilter?.value || "all";


    const availability =
        availabilityFilter?.value || "all";


    const filtered =
        dresses.filter(
            dress => {

                const matchesSearch =
                    !search ||

                    dress.name
                        .toLowerCase()
                        .includes(search) ||

                    dress.category
                        .toLowerCase()
                        .includes(search) ||

                    dress.color
                        .toLowerCase()
                        .includes(search);


                const matchesCategory =
                    category === "all" ||
                    dress.category === category;


                const matchesAvailability =
                    availability === "all" ||
                    normalizeStatus(
                        dress.availability
                    ) === availability;


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesAvailability
                );
            }
        );


    inventoryGrid.innerHTML = "";


    if (filtered.length === 0) {

        emptyState.style.display =
            "block";

        return;
    }


    emptyState.style.display =
        "none";


    filtered.forEach(
        dress => {

            inventoryGrid.appendChild(
                createDressCard(dress)
            );

        }
    );
}


// ======================================================
// CREATE DRESS CARD
// ======================================================

function createDressCard(dress) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "dress-card";


    const status =
        normalizeStatus(
            dress.availability
        );


    const statusClass =
        getAvailabilityClass(
            status
        );


    const photoHTML =
        dress.photo

            ? `
                <img
                    src="${dress.photo}"
                    alt="${escapeHTML(
                        dress.name
                    )}"
                >
            `

            : `
                <div class="dress-photo-placeholder">
                    ◈
                </div>
            `;


    card.innerHTML = `

        <div class="dress-photo">
            ${photoHTML}
        </div>


        <div class="dress-info">

            <div class="dress-top">

                <div>

                    <h3 class="dress-name">
                        ${escapeHTML(
                            dress.name
                        )}
                    </h3>

                    <div class="dress-category">
                        ${escapeHTML(
                            dress.category
                        )}
                    </div>

                </div>


                <span
                    class="status-badge ${statusClass}"
                >
                    ${getStatusSymbol(status)}
                    ${status}
                </span>

            </div>


            <div class="dress-details">

                ${
                    dress.size

                        ? `
                            <span class="detail-pill">
                                Size:
                                ${escapeHTML(
                                    dress.size
                                )}
                            </span>
                        `
                        : ""
                }


                ${
                    dress.color

                        ? `
                            <span class="detail-pill">
                                ${escapeHTML(
                                    dress.color
                                )}
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="dress-price">
                ₱${formatPrice(
                    dress.price
                )}
            </div>


            <div class="dress-actions">

                <button
                    type="button"
                    class="card-btn edit"
                    data-edit-id="${escapeHTML(
                        dress.id
                    )}"
                >
                    Edit
                </button>


                <button
                    type="button"
                    class="card-btn delete"
                    data-delete-id="${escapeHTML(
                        dress.id
                    )}"
                >
                    Delete
                </button>

            </div>

        </div>
    `;


    card
        .querySelector(
            "[data-edit-id]"
        )
        .addEventListener(
            "click",
            () => openEditDressModal(
                dress.id
            )
        );


    card
        .querySelector(
            "[data-delete-id]"
        )
        .addEventListener(
            "click",
            () => deleteDress(
                dress.id
            )
        );


    return card;
}


// ======================================================
// STATUS CLASS
// ======================================================

function getAvailabilityClass(status) {

    switch (
        normalizeStatus(status)
    ) {

        case "Available":
            return "available";

        case "Reserved":
            return "reserved";

        case "Borrowed":
            return "borrowed";

        case "Unavailable":
            return "unavailable";

        default:
            return "available";
    }
}


// ======================================================
// STATUS SYMBOL
// ======================================================

function getStatusSymbol(status) {

    switch (
        normalizeStatus(status)
    ) {

        case "Available":
            return "✓";

        case "Reserved":
            return "◷";

        case "Borrowed":
            return "↗";

        case "Unavailable":
            return "×";

        default:
            return "•";
    }
}


// ======================================================
// DASHBOARD STATS
// ======================================================

function updateDashboardStats() {

    const total =
        dresses.length;


    const available =
        dresses.filter(
            dress =>
                normalizeStatus(
                    dress.availability
                ) === "Available"
        ).length;


    const reserved =
        dresses.filter(
            dress =>
                normalizeStatus(
                    dress.availability
                ) === "Reserved"
        ).length;


    const borrowed =
        dresses.filter(
            dress =>
                normalizeStatus(
                    dress.availability
                ) === "Borrowed"
        ).length;


    const unavailable =
        dresses.filter(
            dress =>
                normalizeStatus(
                    dress.availability
                ) === "Unavailable"
        ).length;


    setText(
        "statTotal",
        total
    );


    setText(
        "statAvailable",
        available
    );


    setText(
        "statReserved",
        reserved
    );


    setText(
        "statBorrowed",
        borrowed
    );


    setText(
        "statUnavailable",
        unavailable
    );


    setText(
        "overviewAvailable",
        available
    );


    setText(
        "overviewReserved",
        reserved
    );


    setText(
        "overviewBorrowed",
        borrowed
    );


    setText(
        "overviewUnavailable",
        unavailable
    );
}


// ======================================================
// CATEGORY FILTER
// ======================================================

function renderCategoryFilter() {

    if (!categoryFilter) {
        return;
    }


    const current =
        categoryFilter.value;


    const categories =
        [
            ...new Set(
                dresses
                    .map(
                        dress =>
                            dress.category
                                ?.trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    categoryFilter.innerHTML = `

        <option value="all">
            All Categories
        </option>

    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category;


            option.textContent =
                category;


            categoryFilter.appendChild(
                option
            );

        }
    );


    if (
        categories.includes(current)
    ) {

        categoryFilter.value =
            current;
    }
}


// ======================================================
// INVENTORY CONTROLS
// ======================================================

function setupInventoryControls() {

    searchInput?.addEventListener(
        "input",
        renderInventory
    );


    categoryFilter?.addEventListener(
        "change",
        renderInventory
    );


    availabilityFilter?.addEventListener(
        "change",
        renderInventory
    );
}


// ======================================================
// IMAGE COMPRESSION
// ======================================================

function compressImage(
    file,
    maxWidth = 900,
    quality = 0.75
) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = event => {

                const image =
                    new Image();


                image.onload = () => {

                    let width =
                        image.width;


                    let height =
                        image.height;


                    if (
                        width >
                        maxWidth
                    ) {

                        height =
                            Math.round(
                                height *
                                (
                                    maxWidth /
                                    width
                                )
                            );


                        width =
                            maxWidth;
                    }


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        width;


                    canvas.height =
                        height;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );


                    resolve(
                        canvas.toDataURL(
                            "image/jpeg",
                            quality
                        )
                    );
                };


                image.onerror =
                    reject;


                image.src =
                    event.target.result;
            };


            reader.onerror =
                reject;


            reader.readAsDataURL(
                file
            );

        }
    );
}


// ======================================================
// HELPERS
// ======================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;
    }
}


function formatPrice(price) {

    return Number(
        price || 0
    ).toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );
}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ======================================================
// START APPLICATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const app =
            document.getElementById(
                "adminApp"
            );


        if (app) {

            app.style.display =
                "none";
        }


        const initialized =
            initializeFirebase();


        if (!initialized) {
            return;
        }


        startAuthentication();

    }
);


// ======================================================
// GLOBAL LOGOUT
// ======================================================

window.logoutAdmin =
    logoutAdmin;