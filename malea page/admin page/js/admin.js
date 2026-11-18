// ============================================================
// MALÉA BY PF
// ADMIN PANEL
// INVENTORY + RESERVATIONS
// FIRESTORE REST API
// ============================================================

const PROJECT_ID = "malea-by-pf";

const DRESSES_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/dresses`;

const RESERVATIONS_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/reservations`;

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let auth = null;
let currentUser = null;

let dresses = [];
let reservations = [];

// ============================================================
// DOM ELEMENTS
// ============================================================

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

let reservationModal;
let reservationForm;
let reservationDocumentId;
let reservationIdDisplay;
let reservationCustomer;
let reservationContact;
let reservationDress;
let reservationDate;
let reservationPickup;
let reservationReturn;
let reservationPrice;
let reservationDeposit;
let reservationPayment;
let reservationStatus;
let reservationNotes;

let reservationsList;
let reservationsEmptyState;
let reservationSearch;
let reservationStatusFilter;

let customerReservationCardModal;

let dashboardTotal;
let dashboardAvailable;
let dashboardReserved;
let dashboardBorrowed;
let dashboardUnavailable;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeAdmin
);

function initializeAdmin() {

    cacheElements();

    initializeFirebase();

    setupNavigation();
    setupDashboardButtons();
    setupInventoryEvents();
    setupReservationEvents();
    setupModalEvents();
    setupLogout();
    setupMobileMenu();

    observeAuth();
}


// ============================================================
// CACHE ELEMENTS
// ============================================================

function cacheElements() {

    inventoryGrid =
        document.getElementById("inventoryGrid");

    emptyState =
        document.getElementById("emptyState");

    searchInput =
        document.getElementById("searchInput");

    categoryFilter =
        document.getElementById("categoryFilter");

    availabilityFilter =
        document.getElementById("availabilityFilter");

    dressModal =
        document.getElementById("dressModal");

    dressForm =
        document.getElementById("dressForm");

    dressId =
        document.getElementById("dressId");

    dressName =
        document.getElementById("dressName");

    dressCategory =
        document.getElementById("dressCategory");

    dressSize =
        document.getElementById("dressSize");

    dressPrice =
        document.getElementById("dressPrice");

    dressAvailability =
        document.getElementById("dressAvailability");

    dressColor =
        document.getElementById("dressColor");

    dressPhoto =
        document.getElementById("dressPhoto");

    photoPreview =
        document.getElementById("photoPreview");

    dressNotes =
        document.getElementById("dressNotes");

    // --------------------------------------------------------
    // RESERVATIONS
    // --------------------------------------------------------

    reservationModal =
        document.getElementById("reservationModal");

    reservationForm =
        document.getElementById("reservationForm");

    reservationDocumentId =
        document.getElementById("reservationDocumentId");

    reservationIdDisplay =
        document.getElementById("reservationIdDisplay");

    reservationCustomer =
        document.getElementById("reservationCustomer");

    reservationContact =
        document.getElementById("reservationContact");

    reservationDress =
        document.getElementById("reservationDress");

    reservationDate =
        document.getElementById("reservationDate");

    reservationPickup =
        document.getElementById("reservationPickup");

    reservationReturn =
        document.getElementById("reservationReturn");

    reservationPrice =
        document.getElementById("reservationPrice");

    reservationDeposit =
        document.getElementById("reservationDeposit");

    reservationPayment =
        document.getElementById("reservationPayment");

    reservationStatus =
        document.getElementById("reservationStatus");

    reservationNotes =
        document.getElementById("reservationNotes");

    reservationsList =
        document.getElementById("reservationsList");

    reservationsEmptyState =
        document.getElementById("reservationsEmptyState");

    reservationSearch =
        document.getElementById("reservationSearch");

    reservationStatusFilter =
        document.getElementById("reservationStatusFilter");

    customerReservationCardModal =
        document.getElementById(
            "customerReservationCardModal"
        );

    // --------------------------------------------------------
    // DASHBOARD
    // --------------------------------------------------------

    dashboardTotal =
        document.getElementById("statTotal");

    dashboardAvailable =
        document.getElementById("statAvailable");

    dashboardReserved =
        document.getElementById("statReserved");

    dashboardBorrowed =
        document.getElementById("statBorrowed");

    dashboardUnavailable =
        document.getElementById("statUnavailable");
}


// ============================================================
// FIREBASE
// ============================================================

function initializeFirebase() {

    try {

        if (typeof firebase === "undefined") {

            console.error(
                "Firebase library was not loaded."
            );

            return;
        }

        if (!window.firebaseConfig) {

            console.error(
                "Firebase configuration was not found."
            );

            return;
        }

        if (!firebase.apps.length) {

            firebase.initializeApp(
                window.firebaseConfig
            );

        }

        auth = firebase.auth();

    } catch (error) {

        console.error(
            "Firebase initialization error:",
            error
        );

    }
}


// ============================================================
// AUTH
// ============================================================

function observeAuth() {

    if (!auth) {

        console.error(
            "Firebase Auth is not available."
        );

        return;
    }

    auth.onAuthStateChanged(
        async user => {

            currentUser = user;

            if (user) {

                console.log(
                    "Admin logged in:",
                    user.email
                );

                hideLoginScreen();

                await loadDresses();
                await loadReservations();

                updateDashboardStats();

                renderInventory();
                renderReservations();

            } else {

                showLoginScreen();

            }

        }
    );
}


// ============================================================
// LOGIN
// ============================================================

function showLoginScreen() {

    const loginScreen =
        document.getElementById(
            "adminLoginScreen"
        );

    if (!loginScreen) {
        return;
    }

    loginScreen.hidden = false;

    loginScreen.innerHTML = `

        <div class="login-box">

            <div class="login-logo">
                MALÉA BY PF
            </div>

            <h2>Admin Login</h2>

            <p class="login-subtitle">
                Sign in to manage your rental system.
            </p>

            <form id="loginForm">

                <div class="login-form">

                    <label>
                        Email Address
                    </label>

                    <input
                        type="email"
                        id="loginEmail"
                        placeholder="Email address"
                        required
                    >

                    <label>
                        Password
                    </label>

                    <input
                        type="password"
                        id="loginPassword"
                        placeholder="Password"
                        required
                    >

                    <p
                        id="loginError"
                        class="login-error"
                        hidden
                    ></p>

                    <button
                        type="submit"
                        class="primary-btn"
                    >
                        Login
                    </button>

                </div>

            </form>

        </div>

    `;

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }
}


function hideLoginScreen() {

    const loginScreen =
        document.getElementById(
            "adminLoginScreen"
        );

    if (loginScreen) {

        loginScreen.hidden = true;
        loginScreen.innerHTML = "";

    }
}


async function handleLogin(event) {

    event.preventDefault();

    if (!auth) {
        return;
    }

    const email =
        document.getElementById(
            "loginEmail"
        )?.value.trim();

    const password =
        document.getElementById(
            "loginPassword"
        )?.value;

    const errorElement =
        document.getElementById(
            "loginError"
        );

    if (errorElement) {

        errorElement.textContent = "";
        errorElement.hidden = true;

    }

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

        if (errorElement) {

            errorElement.textContent =
                "Invalid email or password.";

            errorElement.hidden = false;

        }

    }
}


// ============================================================
// LOGOUT
// ============================================================

function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            try {

                await auth.signOut();

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Unable to logout."
                );

            }

        }
    );
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-item[data-section]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showSection(
                        button.dataset.section
                    );

                }
            );

        });
}


function setupDashboardButtons() {

    document
        .querySelectorAll(
            "[data-section-button]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showSection(
                        button.dataset.sectionButton
                    );

                }
            );

        });
}


function showSection(sectionName) {

    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });

    const selectedSection =
        document.getElementById(
            sectionName
        );

    if (selectedSection) {

        selectedSection.classList.add(
            "active-section"
        );

    }

    document
        .querySelectorAll(
            ".nav-item[data-section]"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section ===
                sectionName
            );

        });

    const titles = {

        dashboard: [
            "Dashboard",
            "Overview of your dress rental business"
        ],

        inventory: [
            "Dress Inventory",
            "Manage your available rental dresses."
        ],

        reservations: [
            "Reservations",
            "Manage all dress reservations."
        ],

        customers: [
            "Customers",
            "Customer management."
        ],

        calendar: [
            "Rental Calendar",
            "View your rental schedule."
        ],

        payments: [
            "Payments",
            "Monitor rental payments."
        ],

        reports: [
            "Reports",
            "Rental business reports."
        ],

        settings: [
            "Settings",
            "System settings."
        ]

    };

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );

    const pageSubtitle =
        document.getElementById(
            "pageSubtitle"
        );

    if (
        titles[sectionName] &&
        pageTitle
    ) {

        pageTitle.textContent =
            titles[sectionName][0];

    }

    if (
        titles[sectionName] &&
        pageSubtitle
    ) {

        pageSubtitle.textContent =
            titles[sectionName][1];

    }

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }

    if (sectionName === "inventory") {

        renderInventory();

    }

    if (sectionName === "reservations") {

        renderReservations();

    }
}


// ============================================================
// MOBILE MENU
// ============================================================

function setupMobileMenu() {

    const mobileMenuButton =
        document.getElementById(
            "mobileMenuButton"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    if (
        !mobileMenuButton ||
        !sidebar
    ) {
        return;
    }

    mobileMenuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );
}


// ============================================================
// INVENTORY EVENTS
// ============================================================

function setupInventoryEvents() {

    const addDressButton =
        document.getElementById(
            "addDressButton"
        );

    if (addDressButton) {

        addDressButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openDressModal();

            }
        );

    }

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderInventory
        );

    }

    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            renderInventory
        );

    }

    if (availabilityFilter) {

        availabilityFilter.addEventListener(
            "change",
            renderInventory
        );

    }

    if (dressPhoto) {

        dressPhoto.addEventListener(
            "change",
            handlePhotoPreview
        );

    }

    if (dressForm) {

        dressForm.addEventListener(
            "submit",
            saveDress
        );

    }

    if (inventoryGrid) {

        inventoryGrid.addEventListener(
            "click",
            handleInventoryClick
        );

    }
}


function handleInventoryClick(event) {

    const editButton =
        event.target.closest(
            "[data-edit-dress]"
        );

    const deleteButton =
        event.target.closest(
            "[data-delete-dress]"
        );

    if (editButton) {

        openDressModal(
            editButton.dataset.editDress
        );

        return;
    }

    if (deleteButton) {

        deleteDress(
            deleteButton.dataset.deleteDress
        );

    }
}


// ============================================================
// LOAD DRESSES
// ============================================================

async function loadDresses() {

    if (!currentUser) {
        return;
    }

    try {

        const token =
            await currentUser.getIdToken();

        let url =
            DRESSES_URL;

        const allDocuments = [];

        while (url) {

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            Authorization:
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

            if (data.documents) {

                allDocuments.push(
                    ...data.documents
                );

            }

            if (data.nextPageToken) {

                url =
                    `${DRESSES_URL}` +
                    `?pageToken=${encodeURIComponent(
                        data.nextPageToken
                    )}`;

            } else {

                url = null;

            }

        }

        dresses =
            allDocuments.map(
                convertFirestoreDocument
            );

        updateCategoryFilter();

        console.log(
            "Dresses loaded:",
            dresses.length
        );

    } catch (error) {

        console.error(
            "Load dresses error:",
            error
        );

    }
}


// ============================================================
// LOAD RESERVATIONS
// ============================================================

async function loadReservations() {

    if (!currentUser) {
        return;
    }

    try {

        const token =
            await currentUser.getIdToken();

        let url =
            RESERVATIONS_URL;

        const allDocuments = [];

        while (url) {

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            Authorization:
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

            if (data.documents) {

                allDocuments.push(
                    ...data.documents
                );

            }

            if (data.nextPageToken) {

                url =
                    `${RESERVATIONS_URL}` +
                    `?pageToken=${encodeURIComponent(
                        data.nextPageToken
                    )}`;

            } else {

                url = null;

            }

        }

        reservations =
            allDocuments.map(
                convertFirestoreDocument
            );

        console.log(
            "Reservations loaded:",
            reservations.length
        );

    } catch (error) {

        console.error(
            "Load reservations error:",
            error
        );

        alert(
            "Unable to load reservations.\n\n" +
            error.message
        );

    }
}


// ============================================================
// FIRESTORE DOCUMENT CONVERTER
// ============================================================

function convertFirestoreDocument(document) {

    const fields =
        document.fields || {};

    const result = {};

    Object.keys(fields)
        .forEach(key => {

            result[key] =
                firestoreValue(
                    fields[key]
                );

        });

    result.id =
        document.name
            ? document.name
                .split("/")
                .pop()
            : "";

    return result;
}


function firestoreValue(value) {

    if (!value) {
        return null;
    }

    if (
        value.stringValue !==
        undefined
    ) {

        return value.stringValue;

    }

    if (
        value.integerValue !==
        undefined
    ) {

        return Number(
            value.integerValue
        );

    }

    if (
        value.doubleValue !==
        undefined
    ) {

        return Number(
            value.doubleValue
        );

    }

    if (
        value.booleanValue !==
        undefined
    ) {

        return value.booleanValue;

    }

    if (
        value.timestampValue !==
        undefined
    ) {

        return value.timestampValue;

    }

    if (
        value.nullValue !==
        undefined
    ) {

        return null;

    }

    if (
        value.arrayValue !==
        undefined
    ) {

        return (
            value.arrayValue.values ||
            []
        ).map(
            firestoreValue
        );

    }

    if (
        value.mapValue !==
        undefined
    ) {

        const result = {};

        Object.keys(
            value.mapValue.fields || {}
        )
        .forEach(key => {

            result[key] =
                firestoreValue(
                    value.mapValue.fields[key]
                );

        });

        return result;
    }

    return null;
}


// ============================================================
// INVENTORY RENDER
// ============================================================

function renderInventory() {

    if (!inventoryGrid) {
        return;
    }

    const search =
        (
            searchInput?.value ||
            ""
        )
        .toLowerCase()
        .trim();

    const category =
        categoryFilter?.value ||
        "all";

    const availability =
        availabilityFilter?.value ||
        "all";

    const filtered =
        dresses.filter(dress => {

            const matchesSearch =
                !search ||
                String(
                    dress.name || ""
                )
                .toLowerCase()
                .includes(search);

            const matchesCategory =
                category === "all" ||
                category === "" ||
                dress.category === category;

            const matchesAvailability =
                availability === "all" ||
                availability === "" ||
                dress.availability === availability;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesAvailability
            );

        });

    inventoryGrid.innerHTML = "";

    if (!filtered.length) {

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    filtered.forEach(dress => {

        try {

            inventoryGrid.appendChild(
                createDressCard(dress)
            );

        } catch (error) {

            console.error(
                "Unable to create dress card:",
                error,
                dress
            );

        }

    });
}


// ============================================================
// DRESS CARD
// ============================================================

function createDressCard(dress) {

    const card =
        document.createElement("article");

    card.className =
        "dress-card";

    const photo =
        dress.photo || "";

    const availability =
        dress.availability ||
        "Available";

    card.innerHTML = `

        <div class="dress-image">

            ${
                photo
                ?
                `
                <img
                    src="${escapeAttribute(photo)}"
                    alt="${escapeAttribute(
                        dress.name ||
                        "Dress"
                    )}"
                >
                `
                :
                `
                <div class="no-photo">
                    No Photo
                </div>
                `
            }

            <span
                class="
                    availability-badge
                    ${getAvailabilityClass(
                        availability
                    )}
                "
            >
                ${escapeHTML(availability)}
            </span>

        </div>

        <div class="dress-card-content">

            <h3>
                ${escapeHTML(
                    dress.name ||
                    "Unnamed Dress"
                )}
            </h3>

            <p>
                ${escapeHTML(
                    dress.category ||
                    "Uncategorized"
                )}
            </p>

            <div class="dress-meta">

                <span>
                    Size:
                    ${escapeHTML(
                        dress.size || "-"
                    )}
                </span>

                <span>
                    ₱${formatMoney(dress.price)}
                </span>

            </div>

            <div class="dress-actions">

                <button
                    type="button"
                    class="small-btn"
                    data-edit-dress="${escapeAttribute(
                        dress.id
                    )}"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="small-btn danger-small"
                    data-delete-dress="${escapeAttribute(
                        dress.id
                    )}"
                >
                    Delete
                </button>

            </div>

        </div>

    `;

    return card;
}


// ============================================================
// DRESS MODAL
// ============================================================

function openDressModal(id = "") {

    if (!dressModal) {
        return;
    }

    if (dressForm) {
        dressForm.reset();
    }

    if (photoPreview) {
        photoPreview.innerHTML = "";
    }

    const title =
        document.getElementById(
            "dressModalTitle"
        );

    if (!id) {

        if (dressId) {
            dressId.value = "";
        }

        if (title) {
            title.textContent =
                "Add Dress";
        }

        dressModal.classList.add(
            "active"
        );

        return;
    }

    const dress =
        dresses.find(
            item => item.id === id
        );

    if (!dress) {
        return;
    }

    if (title) {
        title.textContent =
            "Edit Dress";
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

    dressAvailability.value =
        dress.availability ||
        "Available";

    dressColor.value =
        dress.color || "";

    dressNotes.value =
        dress.notes || "";

    if (
        dress.photo &&
        photoPreview
    ) {

        photoPreview.innerHTML = `

            <img
                src="${escapeAttribute(
                    dress.photo
                )}"
                alt="Preview"
            >

        `;

    }

    dressModal.classList.add(
        "active"
    );
}


function closeDressModal() {

    if (dressModal) {

        dressModal.classList.remove(
            "active"
        );

        dressModal.classList.remove(
            "open"
        );

    }
}


// ============================================================
// PHOTO PREVIEW
// ============================================================

function handlePhotoPreview(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload = function () {

        if (photoPreview) {

            photoPreview.innerHTML = `

                <img
                    src="${escapeAttribute(
                        reader.result
                    )}"
                    alt="Preview"
                >

            `;

        }

    };

    reader.readAsDataURL(file);
}


// ============================================================
// SAVE DRESS
// ============================================================

async function saveDress(event) {

    event.preventDefault();

    if (!currentUser) {

        alert(
            "Please login first."
        );

        return;
    }

    try {

        const token =
            await currentUser.getIdToken();

        let photo =
            dresses.find(
                dress =>
                    dress.id ===
                    dressId.value
            )?.photo || "";

        if (dressPhoto?.files?.[0]) {

            photo =
                await compressImage(
                    dressPhoto.files[0]
                );

        }

        const now =
            new Date().toISOString();

        const data = {

            name:
                dressName.value.trim(),

            category:
                dressCategory.value.trim(),

            size:
                dressSize.value.trim(),

            price:
                Number(
                    dressPrice.value || 0
                ),

            availability:
                dressAvailability.value,

            color:
                dressColor.value.trim(),

            photo,

            notes:
                dressNotes.value.trim(),

            updatedAt:
                now

        };

        let response;

        if (dressId.value) {

            response =
                await fetch(
                    `${DRESSES_URL}/${dressId.value}` +
                    `?updateMask.fieldPaths=name` +
                    `&updateMask.fieldPaths=category` +
                    `&updateMask.fieldPaths=size` +
                    `&updateMask.fieldPaths=price` +
                    `&updateMask.fieldPaths=availability` +
                    `&updateMask.fieldPaths=color` +
                    `&updateMask.fieldPaths=photo` +
                    `&updateMask.fieldPaths=notes` +
                    `&updateMask.fieldPaths=updatedAt`,
                    {

                        method: "PATCH",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields:
                                    convertObjectToFirestoreFields(
                                        data
                                    )
                            })

                    }
                );

        } else {

            data.createdAt = now;

            response =
                await fetch(
                    DRESSES_URL,
                    {

                        method: "POST",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields:
                                    convertObjectToFirestoreFields(
                                        data
                                    )
                            })

                    }
                );

        }

        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }

        closeDressModal();

        await loadDresses();

        renderInventory();

        updateDashboardStats();

    } catch (error) {

        console.error(
            "Save dress error:",
            error
        );

        alert(
            "Unable to save the dress.\n\n" +
            error.message
        );

    }
}


// ============================================================
// DELETE DRESS
// ============================================================

async function deleteDress(id) {

    const dress =
        dresses.find(
            item => item.id === id
        );

    if (!dress) {
        return;
    }

    const confirmed =
        window.confirm(
            `Delete "${dress.name}"?\n\n` +
            `This cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    try {

        const token =
            await currentUser.getIdToken();

        const response =
            await fetch(
                `${DRESSES_URL}/${id}`,
                {

                    method: "DELETE",

                    headers: {

                        Authorization:
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

        renderInventory();

        updateDashboardStats();

    } catch (error) {

        console.error(
            "Delete dress error:",
            error
        );

        alert(
            "Unable to delete the dress.\n\n" +
            error.message
        );

    }
}


// ============================================================
// RESERVATION EVENTS
// ============================================================

function setupReservationEvents() {

    const addReservationButton =
        document.getElementById(
            "addReservationButton"
        );

    if (addReservationButton) {

        addReservationButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openReservationModal();

            }
        );

    }

    if (reservationForm) {

        reservationForm.addEventListener(
            "submit",
            saveReservation
        );

    }

    if (reservationDress) {

        reservationDress.addEventListener(
            "change",
            updateReservationPrice
        );

    }

    if (reservationSearch) {

        reservationSearch.addEventListener(
            "input",
            renderReservations
        );

    }

    if (reservationStatusFilter) {

        reservationStatusFilter.addEventListener(
            "change",
            renderReservations
        );

    }

    if (reservationDate) {

        reservationDate.addEventListener(
            "change",
            () => {

                if (
                    !reservationDocumentId.value
                ) {

                    reservationIdDisplay.value =
                        generateReservationId(
                            reservationDate.value
                        );

                }

            }
        );

    }
}


// ============================================================
// MODAL EVENTS
// ============================================================

function setupModalEvents() {

    const closeDress =
        document.getElementById(
            "closeDressModal"
        );

    const cancelDress =
        document.getElementById(
            "cancelDressButton"
        );

    if (closeDress) {

        closeDress.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeDressModal();

            }
        );

    }

    if (cancelDress) {

        cancelDress.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeDressModal();

            }
        );

    }

    document
        .querySelectorAll(
            "[data-close-dress-modal]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeDressModal();

                }
            );

        });


    // --------------------------------------------------------
    // RESERVATION MODAL
    // --------------------------------------------------------

    const closeReservation =
        document.getElementById(
            "closeReservationModal"
        );

    const cancelReservationButton =
        document.getElementById(
            "cancelReservationButton"
        );

    if (closeReservation) {

        closeReservation.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeReservationModal();

            }
        );

    }

    if (cancelReservationButton) {

        cancelReservationButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeReservationModal();

            }
        );

    }

    document
        .querySelectorAll(
            "[data-close-reservation-modal]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeReservationModal();

                }
            );

        });


    // --------------------------------------------------------
    // CUSTOMER CARD
    // --------------------------------------------------------

    const closeCustomerCard =
        document.getElementById(
            "closeCustomerReservationCard"
        );

    const closeCustomerCardBottom =
        document.getElementById(
            "closeCustomerReservationCardBottom"
        );

    if (closeCustomerCard) {

        closeCustomerCard.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeCustomerReservationCard();

            }
        );

    }

    if (closeCustomerCardBottom) {

        closeCustomerCardBottom.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeCustomerReservationCard();

            }
        );

    }

    document
        .querySelectorAll(
            "[data-close-customer-card]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeCustomerReservationCard();

                }
            );

        });
}


// ============================================================
// RESERVATION ID
// ============================================================

function generateReservationId(
    reservationDateValue
) {

    const date =
        reservationDateValue ||
        new Date()
            .toISOString()
            .split("T")[0];

    const compactDate =
        date.replace(/-/g, "");

    const prefix =
        `MPF-${compactDate}-`;

    let highest = 0;

    reservations.forEach(
        reservation => {

            const existingId =
                String(
                    reservation?.reservationId ||
                    ""
                );

            if (
                existingId.startsWith(prefix)
            ) {

                const match =
                    existingId.match(
                        /-(\d+)$/
                    );

                if (match) {

                    highest =
                        Math.max(
                            highest,
                            Number(match[1])
                        );

                }

            }

        }
    );

    return (
        prefix +
        String(highest + 1)
            .padStart(3, "0")
    );
}


// ============================================================
// OPEN RESERVATION MODAL
// ============================================================

function openReservationModal(id = "") {

    console.log(
        "Opening reservation modal:",
        id || "NEW"
    );

    if (
        !reservationModal ||
        !reservationForm
    ) {

        console.error(
            "Reservation modal/form not found."
        );

        return;
    }

    reservationForm.reset();

    reservationDocumentId.value =
        id || "";

    if (!id) {

        populateReservationDressOptions();

        reservationStatus.value =
            "Pending";

        reservationPayment.value =
            "Unpaid";

        reservationIdDisplay.value =
            generateReservationId();

        reservationModal.classList.add(
            "active"
        );

        return;
    }

    const reservation =
        reservations.find(
            item => item.id === id
        );

    if (!reservation) {

        console.error(
            "Reservation not found:",
            id
        );

        alert(
            "Reservation could not be found."
        );

        return;
    }

    populateReservationDressOptions(
        reservation.dressId || ""
    );

    reservationIdDisplay.value =
        reservation.reservationId ||
        generateReservationId(
            reservation.reservationDate
        );

    reservationCustomer.value =
        reservation.customerName || "";

    reservationContact.value =
        reservation.contact || "";

    reservationDress.value =
        reservation.dressId || "";

    reservationDate.value =
        reservation.reservationDate || "";

    reservationPickup.value =
        reservation.pickupDate || "";

    reservationReturn.value =
        reservation.returnDate || "";

    reservationPrice.value =
        reservation.rentalPrice ?? "";

    reservationDeposit.value =
        reservation.deposit ?? "";

    reservationPayment.value =
        reservation.paymentStatus ||
        "Unpaid";

    reservationStatus.value =
        reservation.status ||
        "Pending";

    reservationNotes.value =
        reservation.notes || "";

    reservationModal.classList.add(
        "active"
    );
}


// ============================================================
// CLOSE RESERVATION MODAL
// ============================================================

function closeReservationModal() {

    if (reservationModal) {

        reservationModal.classList.remove(
            "active"
        );

        reservationModal.classList.remove(
            "open"
        );

    }
}


// ============================================================
// POPULATE DRESS OPTIONS
// ============================================================

function populateReservationDressOptions(
    selectedDressId = ""
) {

    if (!reservationDress) {
        return;
    }

    reservationDress.innerHTML = `

        <option value="">
            Select a dress
        </option>

    `;

    dresses.forEach(dress => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            dress.id;

        option.textContent =
            `${dress.name || "Unnamed Dress"} — ` +
            `${dress.availability || "Available"}`;

        if (
            dress.id ===
            selectedDressId
        ) {

            option.selected = true;

        }

        reservationDress.appendChild(
            option
        );

    });
}


// ============================================================
// UPDATE RESERVATION PRICE
// ============================================================

function updateReservationPrice() {

    const selectedDress =
        dresses.find(
            dress =>
                dress.id ===
                reservationDress.value
        );

    if (!selectedDress) {
        return;
    }

    if (
        !reservationDocumentId.value
    ) {

        reservationPrice.value =
            selectedDress.price || "";

    }
}


// ============================================================
// SAVE RESERVATION
// ============================================================

async function saveReservation(event) {

    event.preventDefault();

    if (!currentUser) {

        alert(
            "Please login first."
        );

        return;
    }

    try {

        const token =
            await currentUser.getIdToken();

        const selectedDress =
            dresses.find(
                dress =>
                    dress.id ===
                    reservationDress.value
            );

        if (!selectedDress) {

            alert(
                "Please select a dress."
            );

            return;
        }

        const existingReservation =
            reservationDocumentId.value
            ?
            reservations.find(
                reservation =>
                    reservation.id ===
                    reservationDocumentId.value
            )
            :
            null;

        const now =
            new Date().toISOString();

        const reservationId =
            existingReservation?.reservationId ||
            reservationIdDisplay.value ||
            generateReservationId(
                reservationDate.value
            );

        const status =
            reservationStatus.value ||
            "Pending";

        const data = {

            reservationId,

            customerName:
                reservationCustomer.value.trim(),

            contact:
                reservationContact.value.trim(),

            dressId:
                selectedDress.id,

            dressName:
                selectedDress.name || "",

            reservationDate:
                reservationDate.value,

            pickupDate:
                reservationPickup.value,

            returnDate:
                reservationReturn.value,

            rentalPrice:
                Number(
                    reservationPrice.value || 0
                ),

            deposit:
                Number(
                    reservationDeposit.value || 0
                ),

            paymentStatus:
                reservationPayment.value ||
                "Unpaid",

            status,

            notes:
                reservationNotes.value.trim(),

            updatedAt:
                now

        };

        // ----------------------------------------------------
        // EDIT
        // ----------------------------------------------------

        if (existingReservation) {

            const response =
                await fetch(
                    `${RESERVATIONS_URL}/${existingReservation.id}` +
                    `?updateMask.fieldPaths=reservationId` +
                    `&updateMask.fieldPaths=customerName` +
                    `&updateMask.fieldPaths=contact` +
                    `&updateMask.fieldPaths=dressId` +
                    `&updateMask.fieldPaths=dressName` +
                    `&updateMask.fieldPaths=reservationDate` +
                    `&updateMask.fieldPaths=pickupDate` +
                    `&updateMask.fieldPaths=returnDate` +
                    `&updateMask.fieldPaths=rentalPrice` +
                    `&updateMask.fieldPaths=deposit` +
                    `&updateMask.fieldPaths=paymentStatus` +
                    `&updateMask.fieldPaths=status` +
                    `&updateMask.fieldPaths=notes` +
                    `&updateMask.fieldPaths=updatedAt`,
                    {

                        method: "PATCH",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields:
                                    convertObjectToFirestoreFields(
                                        data
                                    )
                            })

                    }
                );

            if (!response.ok) {

                throw new Error(
                    await response.text()
                );

            }

            await synchronizeDressStatus(
                existingReservation,
                {
                    ...existingReservation,
                    ...data
                }
            );

        }

        // ----------------------------------------------------
        // NEW
        // ----------------------------------------------------

        else {

            data.createdAt = now;

            const response =
                await fetch(
                    RESERVATIONS_URL,
                    {

                        method: "POST",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields:
                                    convertObjectToFirestoreFields(
                                        data
                                    )
                            })

                    }
                );

            if (!response.ok) {

                throw new Error(
                    await response.text()
                );

            }

            if (status === "Confirmed") {

                await updateDressStatus(
                    selectedDress.id,
                    "Reserved"
                );

            }

        }

        closeReservationModal();

        await loadDresses();
        await loadReservations();

        updateDashboardStats();

        renderInventory();
        renderReservations();

        alert(
            "Reservation saved successfully."
        );

    } catch (error) {

        console.error(
            "Save reservation error:",
            error
        );

        alert(
            "Unable to save the reservation.\n\n" +
            error.message
        );

    }
}


// ============================================================
// SYNCHRONIZE DRESS STATUS
// ============================================================

async function synchronizeDressStatus(
    oldReservation,
    newReservation
) {

    const oldConfirmed =
        oldReservation.status === "Confirmed";

    const newConfirmed =
        newReservation.status === "Confirmed";

    const oldDressId =
        oldReservation.dressId;

    const newDressId =
        newReservation.dressId;

    if (
        oldConfirmed &&
        newConfirmed
    ) {

        if (
            oldDressId !==
            newDressId
        ) {

            await updateDressStatus(
                oldDressId,
                "Available"
            );

            await updateDressStatus(
                newDressId,
                "Reserved"
            );

        }

        return;
    }

    if (
        oldConfirmed &&
        !newConfirmed
    ) {

        await updateDressStatus(
            oldDressId,
            "Available"
        );

        return;
    }

    if (
        !oldConfirmed &&
        newConfirmed
    ) {

        await updateDressStatus(
            newDressId,
            "Reserved"
        );

    }
}


// ============================================================
// UPDATE DRESS STATUS
// ============================================================

async function updateDressStatus(
    dressIdValue,
    status
) {

    if (
        !dressIdValue ||
        !currentUser
    ) {

        return;
    }

    const token =
        await currentUser.getIdToken();

    const response =
        await fetch(
            `${DRESSES_URL}/${dressIdValue}` +
            `?updateMask.fieldPaths=availability` +
            `&updateMask.fieldPaths=updatedAt`,
            {

                method: "PATCH",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({
                        fields: {

                            availability: {
                                stringValue:
                                    status
                            },

                            updatedAt: {
                                stringValue:
                                    new Date()
                                        .toISOString()
                            }

                        }
                    })

            }
        );

    if (!response.ok) {

        throw new Error(
            await response.text()
        );

    }
}


// ============================================================
// RENDER RESERVATIONS
// ============================================================

function renderReservations() {

    if (!reservationsList) {
        return;
    }

    const search =
        (
            reservationSearch?.value ||
            ""
        )
        .toLowerCase()
        .trim();

    const selectedStatus =
        reservationStatusFilter?.value ||
        "all";

    const filtered =
        reservations
            .filter(Boolean)
            .slice()
            .sort((a, b) => {

                const dateA =
                    String(
                        a?.reservationDate ||
                        a?.createdAt ||
                        ""
                    );

                const dateB =
                    String(
                        b?.reservationDate ||
                        b?.createdAt ||
                        ""
                    );

                return dateB.localeCompare(
                    dateA
                );

            })
            .filter(reservation => {

                const searchable =
                    [
                        reservation?.reservationId,
                        reservation?.customerName,
                        reservation?.contact,
                        reservation?.dressName
                    ]
                    .map(
                        value =>
                            String(
                                value ?? ""
                            )
                    )
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const matchesStatus =
                    selectedStatus === "all" ||
                    selectedStatus === "" ||
                    reservation?.status ===
                    selectedStatus;

                return (
                    matchesSearch &&
                    matchesStatus
                );

            });

    reservationsList.innerHTML = "";

    if (!filtered.length) {

        if (reservationsEmptyState) {

            reservationsEmptyState.hidden =
                false;

        }

        return;
    }

    if (reservationsEmptyState) {

        reservationsEmptyState.hidden =
            true;

    }

    /*
     * IMPORTANT:
     *
     * Render each reservation independently.
     *
     * If one old/broken record contains
     * unexpected data, it will not prevent
     * the remaining reservations from loading.
     */

    filtered.forEach(reservation => {

        try {

            const card =
                createReservationCard(
                    reservation
                );

            if (card) {

                reservationsList.appendChild(
                    card
                );

            }

        } catch (error) {

            console.error(
                "Unable to create reservation card.",
                error,
                reservation
            );

            /*
             * Show a safe fallback card instead
             * of breaking the entire Reservations page.
             */

            const fallback =
                document.createElement(
                    "article"
                );

            fallback.className =
                "reservation-card";

            fallback.innerHTML = `

                <div
                    class="reservation-dress-placeholder"
                >
                    M
                </div>

                <div class="reservation-main">

                    <div class="reservation-top-line">

                        <span class="reservation-id">
                            Reservation
                        </span>

                        <span
                            class="status-badge
                                   reservation-pending"
                        >
                            Needs Review
                        </span>

                    </div>

                    <div class="reservation-customer">
                        ${
                            escapeHTML(
                                reservation?.customerName ||
                                "Unnamed Customer"
                            )
                        }
                    </div>

                    <div class="reservation-contact">
                        ${
                            escapeHTML(
                                reservation?.contact ||
                                "-"
                            )
                        }
                    </div>

                    <div class="reservation-dress-name">
                        Reservation record
                    </div>

                </div>

                <div class="reservation-financials">

                    <div class="reservation-financial-row">

                        <strong>
                            —
                        </strong>

                        <span>
                            Record requires review
                        </span>

                    </div>

                </div>

            `;

            reservationsList.appendChild(
                fallback
            );

        }

    });
}


// ============================================================
// CREATE RESERVATION CARD
// ============================================================

function createReservationCard(
    reservation
) {

    /*
     * Normalize the reservation first.
     *
     * This protects the UI from old Firestore
     * records with missing/null fields.
     */

    if (
        !reservation ||
        typeof reservation !== "object"
    ) {

        throw new Error(
            "Invalid reservation record."
        );

    }

    const safeReservation = {
        id:
            String(
                reservation.id ?? ""
            ),

        reservationId:
            String(
                reservation.reservationId ?? ""
            ),

        customerName:
            String(
                reservation.customerName ?? ""
            ),

        contact:
            String(
                reservation.contact ?? ""
            ),

        dressId:
            String(
                reservation.dressId ?? ""
            ),

        dressName:
            String(
                reservation.dressName ?? ""
            ),

        reservationDate:
            String(
                reservation.reservationDate ?? ""
            ),

        pickupDate:
            String(
                reservation.pickupDate ?? ""
            ),

        returnDate:
            String(
                reservation.returnDate ?? ""
            ),

        rentalPrice:
            Number(
                reservation.rentalPrice ?? 0
            ),

        deposit:
            Number(
                reservation.deposit ?? 0
            ),

        paymentStatus:
            String(
                reservation.paymentStatus ??
                "Unpaid"
            ),

        status:
            String(
                reservation.status ??
                "Pending"
            ),

        notes:
            String(
                reservation.notes ?? ""
            )
    };

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "reservation-card";


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status =
        safeReservation.status ||
        "Pending";

    const payment =
        safeReservation.paymentStatus ||
        "Unpaid";


    // --------------------------------------------------------
    // DRESS
    // --------------------------------------------------------

    const dress =
        dresses.find(
            item =>
                String(item?.id ?? "") ===
                safeReservation.dressId
        );

    const dressPhoto =
        dress?.photo
            ? String(dress.photo)
            : "";


    // --------------------------------------------------------
    // IMAGE
    // --------------------------------------------------------

    let imageHTML = "";

    if (dressPhoto) {

        imageHTML = `

            <img
                class="reservation-dress-photo"
                src="${escapeAttribute(
                    dressPhoto
                )}"
                alt="${escapeAttribute(
                    safeReservation.dressName ||
                    "Dress"
                )}"
                loading="lazy"
            >

        `;

    } else {

        imageHTML = `

            <div
                class="reservation-dress-placeholder"
            >
                M
            </div>

        `;

    }


    // --------------------------------------------------------
    // CANCEL BUTTON
    // --------------------------------------------------------

    let cancelButton = "";

    if (
        status !== "Cancelled" &&
        status !== "Completed"
    ) {

        cancelButton = `

            <button
                type="button"
                class="
                    small-btn
                    cancel-reservation-btn
                "
                data-cancel-reservation="${escapeAttribute(
                    safeReservation.id
                )}"
            >
                Cancel Reservation
            </button>

        `;

    }


    // --------------------------------------------------------
    // CARD HTML
    // --------------------------------------------------------

    card.innerHTML = `

        ${imageHTML}

        <div class="reservation-main">

            <div class="reservation-top-line">

                <span class="reservation-id">

                    ${escapeHTML(
                        safeReservation.reservationId ||
                        "No ID"
                    )}

                </span>

                <span
                    class="
                        status-badge
                        ${getReservationStatusClass(
                            status
                        )}
                "
                >

                    ${escapeHTML(status)}

                </span>

            </div>


            <div class="reservation-customer">

                ${escapeHTML(
                    safeReservation.customerName ||
                    "Unnamed Customer"
                )}

            </div>


            <div class="reservation-contact">

                ${escapeHTML(
                    safeReservation.contact ||
                    "-"
                )}

            </div>


            <div class="reservation-dress-name">

                ${escapeHTML(
                    safeReservation.dressName ||
                    "Dress not specified"
                )}

            </div>


            <div class="reservation-details">

                <div class="reservation-detail">

                    <span
                        class="reservation-detail-label"
                    >
                        Pickup
                    </span>

                    <span
                        class="reservation-detail-value"
                    >
                        ${formatDate(
                            safeReservation.pickupDate
                        )}
                    </span>

                </div>


                <div class="reservation-detail">

                    <span
                        class="reservation-detail-label"
                    >
                        Return
                    </span>

                    <span
                        class="reservation-detail-value"
                    >
                        ${formatDate(
                            safeReservation.returnDate
                        )}
                    </span>

                </div>


                <div class="reservation-detail">

                    <span
                        class="reservation-detail-label"
                    >
                        Payment
                    </span>

                    <span
                        class="reservation-detail-value"
                    >
                        ${escapeHTML(payment)}
                    </span>

                </div>

            </div>

        </div>


        <div class="reservation-financials">

            <div class="reservation-financial-row">

                <strong>

                    ₱${formatMoney(
                        safeReservation.rentalPrice
                    )}

                </strong>

                <span>
                    Rental Price
                </span>

            </div>


            <div class="reservation-financial-row">

                <span>

                    Deposit:
                    ₱${formatMoney(
                        safeReservation.deposit
                    )}

                </span>

            </div>


            <div class="reservation-actions">

                <button
                    type="button"
                    class="small-btn"
                    data-edit-reservation="${escapeAttribute(
                        safeReservation.id
                    )}"
                >
                    Edit
                </button>


                <button
                    type="button"
                    class="small-btn primary-small"
                    data-view-reservation="${escapeAttribute(
                        safeReservation.id
                    )}"
                >
                    Reservation Card
                </button>


                ${cancelButton}

            </div>

        </div>

    `;


    // --------------------------------------------------------
    // BUTTON EVENTS
    // --------------------------------------------------------

    const editButton =
        card.querySelector(
            "[data-edit-reservation]"
        );

    const viewButton =
        card.querySelector(
            "[data-view-reservation]"
        );

    const cancelButtonElement =
        card.querySelector(
            "[data-cancel-reservation]"
        );


    if (editButton) {

        editButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                openReservationModal(
                    safeReservation.id
                );

            }
        );

    }


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                openCustomerReservationCard(
                    safeReservation.id
                );

            }
        );

    }


    if (cancelButtonElement) {

        cancelButtonElement.addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();

                try {

                    await cancelReservation(
                        safeReservation.id
                    );

                } catch (error) {

                    console.error(
                        "Cancel button error:",
                        error
                    );

                }

            }
        );

    }

    return card;
}


// ============================================================
// CANCEL RESERVATION
// ============================================================

async function cancelReservation(
    reservationDocumentId
) {

    const reservation =
        reservations.find(
            item =>
                item.id ===
                reservationDocumentId
        );

    if (!reservation) {

        alert(
            "Reservation could not be found."
        );

        return;
    }

    if (
        reservation.status ===
        "Cancelled"
    ) {

        return;
    }

    if (
        reservation.status ===
        "Completed"
    ) {

        alert(
            "Completed reservations cannot be cancelled."
        );

        return;
    }

    const confirmed =
        window.confirm(

            `Cancel reservation ${
                reservation.reservationId ||
                ""
            }?\n\n` +

            `Customer: ${
                reservation.customerName ||
                "-"
            }\n` +

            `Dress: ${
                reservation.dressName ||
                "-"
            }\n\n` +

            `The reservation will remain in your records.`

        );

    if (!confirmed) {
        return;
    }

    try {

        if (!currentUser) {

            alert(
                "Please login first."
            );

            return;
        }

        const token =
            await currentUser.getIdToken();

        const response =
            await fetch(
                `${RESERVATIONS_URL}/${reservationDocumentId}` +
                `?updateMask.fieldPaths=status` +
                `&updateMask.fieldPaths=updatedAt`,
                {

                    method: "PATCH",

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            fields: {

                                status: {
                                    stringValue:
                                        "Cancelled"
                                },

                                updatedAt: {
                                    stringValue:
                                        new Date()
                                            .toISOString()
                                }

                            }
                        })

                }
            );

        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }

        if (
            reservation.status ===
            "Confirmed"
        ) {

            await updateDressStatus(
                reservation.dressId,
                "Available"
            );

        }

        await loadDresses();
        await loadReservations();

        updateDashboardStats();

        renderInventory();
        renderReservations();

    } catch (error) {

        console.error(
            "Cancel reservation error:",
            error
        );

        alert(
            "Unable to cancel the reservation.\n\n" +
            error.message
        );

    }
}


// ============================================================
// CUSTOMER RESERVATION CARD
// ============================================================

function openCustomerReservationCard(
    reservationDocumentId
) {

    const reservation =
        reservations.find(
            item =>
                item.id ===
                reservationDocumentId
        );

    if (!reservation) {

        alert(
            "Reservation could not be found."
        );

        return;
    }

    const dress =
        dresses.find(
            item =>
                item.id ===
                reservation.dressId
        );

    const dressPhoto =
        dress?.photo ||
        "";

    setText(
        "cardReservationId",
        reservation.reservationId || "-"
    );

    setText(
        "cardCustomer",
        reservation.customerName || "-"
    );

    setText(
        "cardContact",
        reservation.contact || "-"
    );

    setText(
        "cardDress",
        reservation.dressName || "-"
    );

    setText(
        "cardPickup",
        formatDate(
            reservation.pickupDate
        )
    );

    setText(
        "cardReturn",
        formatDate(
            reservation.returnDate
        )
    );

    setText(
        "cardRentalPrice",
        `₱${formatMoney(
            reservation.rentalPrice
        )}`
    );

    setText(
        "cardDeposit",
        `₱${formatMoney(
            reservation.deposit
        )}`
    );

    setText(
        "cardPaymentStatus",
        reservation.paymentStatus ||
        "Unpaid"
    );

    setText(
        "cardReservationStatus",
        reservation.status ||
        "Pending"
    );

    const photo =
        document.getElementById(
            "cardDressPhoto"
        );

    if (photo) {

        if (dressPhoto) {

            photo.src =
                dressPhoto;

            photo.style.display =
                "block";

        } else {

            photo.removeAttribute(
                "src"
            );

            photo.style.display =
                "none";

        }

    }

    if (
        customerReservationCardModal
    ) {

        customerReservationCardModal.classList.add(
            "active"
        );

    }
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }
}


function closeCustomerReservationCard() {

    if (
        customerReservationCardModal
    ) {

        customerReservationCardModal.classList.remove(
            "active"
        );

        customerReservationCardModal.classList.remove(
            "open"
        );

    }
}


// ============================================================
// DASHBOARD
// ============================================================

function updateDashboardStats() {

    const total =
        dresses.length;

    const available =
        dresses.filter(
            dress =>
                dress.availability ===
                "Available"
        ).length;

    const reserved =
        dresses.filter(
            dress =>
                dress.availability ===
                "Reserved"
        ).length;

    const borrowed =
        dresses.filter(
            dress =>
                dress.availability ===
                "Borrowed"
        ).length;

    const unavailable =
        dresses.filter(
            dress =>
                dress.availability ===
                "Unavailable"
        ).length;

    if (dashboardTotal) {

        dashboardTotal.textContent =
            total;

    }

    if (dashboardAvailable) {

        dashboardAvailable.textContent =
            available;

    }

    if (dashboardReserved) {

        dashboardReserved.textContent =
            reserved;

    }

    if (dashboardBorrowed) {

        dashboardBorrowed.textContent =
            borrowed;

    }

    if (dashboardUnavailable) {

        dashboardUnavailable.textContent =
            unavailable;

    }
}


// ============================================================
// CATEGORY FILTER
// ============================================================

function updateCategoryFilter() {

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
                    )
                    .filter(Boolean)
            )
        ]
        .sort();

    categoryFilter.innerHTML = `

        <option value="all">
            All Categories
        </option>

    `;

    categories.forEach(category => {

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

    });

    if (
        categories.includes(current)
    ) {

        categoryFilter.value =
            current;

    } else {

        categoryFilter.value =
            "all";

    }
}


// ============================================================
// FIRESTORE CONVERTER
// ============================================================

function convertObjectToFirestoreFields(
    object
) {

    const fields = {};

    Object.keys(object)
        .forEach(key => {

            const value =
                object[key];

            if (
                value === undefined ||
                value === null
            ) {

                return;
            }

            if (
                typeof value ===
                "string"
            ) {

                fields[key] = {
                    stringValue:
                        value
                };

            } else if (
                typeof value ===
                "number"
            ) {

                if (
                    Number.isInteger(value)
                ) {

                    fields[key] = {
                        integerValue:
                            String(value)
                    };

                } else {

                    fields[key] = {
                        doubleValue:
                            value
                    };

                }

            } else if (
                typeof value ===
                "boolean"
            ) {

                fields[key] = {
                    booleanValue:
                        value
                };

            }

        });

    return fields;
}


// ============================================================
// IMAGE COMPRESSION
// ============================================================

function compressImage(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload =
                event => {

                    const image =
                        new Image();

                    image.onload =
                        function () {

                            const canvas =
                                document.createElement(
                                    "canvas"
                                );

                            const maxWidth =
                                1000;

                            const scale =
                                Math.min(
                                    1,
                                    maxWidth /
                                    image.width
                                );

                            canvas.width =
                                image.width *
                                scale;

                            canvas.height =
                                image.height *
                                scale;

                            const context =
                                canvas.getContext(
                                    "2d"
                                );

                            context.drawImage(
                                image,
                                0,
                                0,
                                canvas.width,
                                canvas.height
                            );

                            resolve(
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.82
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

            reader.readAsDataURL(file);

        }
    );
}


// ============================================================
// STATUS CLASSES
// ============================================================

function getAvailabilityClass(status) {

    switch (status) {

        case "Available":
            return "status-available";

        case "Reserved":
            return "status-reserved";

        case "Borrowed":
            return "status-borrowed";

        case "Unavailable":
            return "status-unavailable";

        default:
            return "";

    }
}


function getReservationStatusClass(status) {

    switch (status) {

        case "Confirmed":
            return "reservation-confirmed";

        case "Pending":
            return "reservation-pending";

        case "Cancelled":
            return "reservation-cancelled";

        case "Completed":
            return "reservation-completed";

        default:
            return "reservation-pending";

    }
}


// ============================================================
// FORMATTING
// ============================================================

function formatMoney(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return "0.00";

    }

    return number.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(dateString);

    }

    return date.toLocaleDateString(
        "en-PH",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


// ============================================================
// ESCAPING
// ============================================================

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


function escapeAttribute(value) {

    return escapeHTML(value);
}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.openDressModal =
    openDressModal;

window.closeDressModal =
    closeDressModal;

window.openReservationModal =
    openReservationModal;

window.closeReservationModal =
    closeReservationModal;

window.openCustomerReservationCard =
    openCustomerReservationCard;

window.closeCustomerReservationCard =
    closeCustomerReservationCard;

window.cancelReservation =
    cancelReservation;

window.showSection =
    showSection;


// ============================================================
// END
// ============================================================