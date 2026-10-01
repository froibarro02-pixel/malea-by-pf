// ==========================================
// MALÉA BY PF
// ADMIN PANEL
// DRESS INVENTORY
// FIRESTORE REST API
// ==========================================


// ==========================================
// FIREBASE PROJECT
// ==========================================

const PROJECT_ID = "malea-by-pf";

const API_KEY =
    "AIzaSyCo6oYU8RpConNDMzBuS8CQyIFG2gm0kic";

const FIRESTORE_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/dresses`;


// ==========================================
// VARIABLES
// ==========================================

let dresses = [];

let selectedPhotoData = "";


// ==========================================
// DOM ELEMENTS
// ==========================================

const inventoryGrid =
    document.getElementById("inventoryGrid");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");

const availabilityFilter =
    document.getElementById("availabilityFilter");

const dressModal =
    document.getElementById("dressModal");

const dressForm =
    document.getElementById("dressForm");

const dressId =
    document.getElementById("dressId");

const dressName =
    document.getElementById("dressName");

const dressCategory =
    document.getElementById("dressCategory");

const dressSize =
    document.getElementById("dressSize");

const dressPrice =
    document.getElementById("dressPrice");

const dressAvailability =
    document.getElementById("dressAvailability");

const dressColor =
    document.getElementById("dressColor");

const dressNotes =
    document.getElementById("dressNotes");

const dressPhoto =
    document.getElementById("dressPhoto");

const photoPreview =
    document.getElementById("photoPreview");

const pageTitle =
    document.getElementById("pageTitle");

const pageSubtitle =
    document.getElementById("pageSubtitle");

const sidebar =
    document.getElementById("sidebar");

const mobileMenu =
    document.getElementById("mobileMenu");

const navItems =
    document.querySelectorAll("[data-section]");

const pageSections =
    document.querySelectorAll(".section");


// ==========================================
// PAGE TITLES
// ==========================================

const pageTitles = {

    dashboard: [
        "Dashboard",
        "Overview of your rental business."
    ],

    inventory: [
        "Dress Inventory",
        "Manage your dresses and rental availability."
    ],

    reservations: [
        "Reservations",
        "Manage customer reservations."
    ],

    customers: [
        "Customers",
        "Manage customer records."
    ],

    calendar: [
        "Rental Calendar",
        "View your rental schedule."
    ],

    payments: [
        "Payments",
        "Track rental payments and balances."
    ],

    reports: [
        "Reports",
        "View inventory and rental reports."
    ],

    settings: [
        "Settings",
        "Manage your admin settings."
    ]

};


// ==========================================
// FIRESTORE VALUE
// ==========================================

function firestoreValue(value) {

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        return {
            doubleValue: value
        };

    }

    return {
        stringValue: String(value ?? "")
    };

}


// ==========================================
// FIRESTORE DOCUMENT
// ==========================================

function convertFirestoreDocument(document) {

    const fields =
        document.fields || {};

    return {

        id:
            document.name
                ? document.name.split("/").pop()
                : "",

        name:
            fields.name?.stringValue || "",

        category:
            fields.category?.stringValue || "",

        size:
            fields.size?.stringValue || "",

        price:
            Number(
                fields.price?.doubleValue ??
                fields.price?.integerValue ??
                0
            ),

        availability:
            fields.availability?.stringValue ||
            "Available",

        color:
            fields.color?.stringValue || "",

        notes:
            fields.notes?.stringValue || "",

        photo:
            fields.photo?.stringValue || "",

        createdAt:
            fields.createdAt?.stringValue || "",

        updatedAt:
            fields.updatedAt?.stringValue || ""

    };

}


// ==========================================
// LOAD DRESSES
// ==========================================

async function loadDresses() {

    try {

        const response =
            await fetch(
                `${FIRESTORE_URL}?key=${API_KEY}`
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        const data =
            await response.json();


        dresses =
            (data.documents || [])
                .map(convertFirestoreDocument)
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0) -
                        new Date(a.createdAt || 0)
                );


        renderInventory();

        updateDashboardStats();

        renderDashboardRecent();


    } catch (error) {

        console.error(
            "Firestore load error:",
            error
        );


        showError(
            "Unable to load the dress inventory.\n\n" +
            error.message
        );

    }

}


// ==========================================
// PHOTO FILE SELECTION
// ==========================================

if (dressPhoto) {

    dressPhoto.addEventListener(
        "change",
        handlePhotoSelection
    );

}


async function handlePhotoSelection(event) {

    const file =
        event.target.files[0];


    if (!file) {

        selectedPhotoData = "";

        showPhotoPreview("");

        return;

    }


    if (!file.type.startsWith("image/")) {

        alert(
            "Please select an image file."
        );

        dressPhoto.value = "";

        return;

    }


    try {

        selectedPhotoData =
            await compressImage(file);


        showPhotoPreview(
            selectedPhotoData
        );


    } catch (error) {

        console.error(
            "Photo processing error:",
            error
        );


        alert(
            "Unable to process this photo."
        );

    }

}


// ==========================================
// COMPRESS IMAGE
// ==========================================

function compressImage(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = event => {

                const image =
                    new Image();


                image.onload = () => {

                    const maxWidth = 800;

                    const maxHeight = 1000;


                    let width =
                        image.width;

                    let height =
                        image.height;


                    const ratio =
                        Math.min(
                            maxWidth / width,
                            maxHeight / height,
                            1
                        );


                    width =
                        Math.round(
                            width * ratio
                        );


                    height =
                        Math.round(
                            height * ratio
                        );


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


                    const compressed =
                        canvas.toDataURL(
                            "image/jpeg",
                            0.70
                        );


                    resolve(
                        compressed
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


// ==========================================
// PHOTO PREVIEW
// ==========================================

function showPhotoPreview(photo) {

    if (!photoPreview) return;


    if (!photo) {

        photoPreview.innerHTML =
            "<span>No photo selected</span>";

        return;

    }


    photoPreview.innerHTML = `

        <img
            src="${photo}"
            alt="Dress preview"
        >

    `;

}


// ==========================================
// RENDER INVENTORY
// ==========================================

function renderInventory() {

    if (!inventoryGrid) return;


    const searchTerm =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "";


    const selectedAvailability =
        availabilityFilter
            ? availabilityFilter.value
            : "";


    const filteredDresses =
        dresses.filter(dress => {

            const searchableText = [

                dress.name,
                dress.category,
                dress.color,
                dress.size,
                dress.notes

            ]
                .join(" ")
                .toLowerCase();


            return (

                (!searchTerm ||
                    searchableText.includes(
                        searchTerm
                    )
                ) &&

                (!selectedCategory ||
                    dress.category ===
                    selectedCategory
                ) &&

                (!selectedAvailability ||
                    dress.availability ===
                    selectedAvailability
                )

            );

        });


    inventoryGrid.innerHTML = "";


    if (filteredDresses.length === 0) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filteredDresses.forEach(dress => {

        const card =
            document.createElement("div");


        card.className =
            "dress-card";


        const availability =
            dress.availability ||
            "Available";


        const photoHTML =
            dress.photo

                ? `
                    <img
                        class="dress-photo-image"
                        src="${dress.photo}"
                        alt="${escapeHTML(
                            dress.name ||
                            "Dress"
                        )}"
                    >
                `

                : `

                    <div class="dress-photo-placeholder">

                        <span>✦</span>

                        <small>
                            Maléa by PF
                        </small>

                    </div>

                `;


        card.innerHTML = `

            <div class="dress-photo">

                ${photoHTML}


                <span class="status ${getAvailabilityClass(availability)}">

                    ${escapeHTML(
                        availability
                    )}

                </span>

            </div>


            <div class="dress-body">

                <div class="dress-top">

                    <div>

                        <div class="dress-name">

                            ${escapeHTML(
                                dress.name ||
                                "Unnamed Dress"
                            )}

                        </div>


                        <div class="dress-category">

                            ${escapeHTML(
                                dress.category ||
                                "Uncategorized"
                            )}

                        </div>

                    </div>

                </div>


                <div class="dress-meta">

                    <div>

                        <span>
                            Size
                        </span>

                        <strong>

                            ${escapeHTML(
                                dress.size ||
                                "-"
                            )}

                        </strong>

                    </div>


                    <div>

                        <span>
                            Color
                        </span>

                        <strong>

                            ${escapeHTML(
                                dress.color ||
                                "-"
                            )}

                        </strong>

                    </div>

                </div>


                ${
                    dress.notes
                    ? `
                        <div class="dress-notes">

                            ${escapeHTML(
                                dress.notes
                            )}

                        </div>
                    `
                    : ""
                }


                <div class="dress-price">

                    <span>
                        Rental Price
                    </span>

                    <strong>

                        ₱${Number(
                            dress.price || 0
                        ).toLocaleString(
                            "en-PH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}

                    </strong>

                </div>


                <div class="dress-actions">

                    <button
                        type="button"
                        class="small-btn"
                        onclick="editDress('${escapeAttribute(dress.id)}')"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="small-btn delete"
                        onclick="removeDress('${escapeAttribute(dress.id)}')"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `;


        inventoryGrid.appendChild(card);

    });

}


// ==========================================
// ADD DRESS
// ==========================================

document
    .querySelectorAll("[data-open-add]")
    .forEach(button => {

        button.addEventListener(
            "click",
            openAddDressModal
        );

    });


function openAddDressModal() {

    if (!dressModal) return;


    if (dressForm) {

        dressForm.reset();

    }


    if (dressId) {

        dressId.value = "";

    }


    selectedPhotoData = "";

    showPhotoPreview("");


    const modalTitle =
        document.getElementById(
            "modalTitle"
        );


    if (modalTitle) {

        modalTitle.textContent =
            "Add Dress";

    }


    dressModal.classList.add(
        "active"
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

document
    .querySelectorAll("[data-close-modal]")
    .forEach(button => {

        button.addEventListener(
            "click",
            closeDressModal
        );

    });


function closeDressModal() {

    if (!dressModal) return;


    dressModal.classList.remove(
        "active"
    );


    if (dressForm) {

        dressForm.reset();

    }


    if (dressId) {

        dressId.value = "";

    }


    selectedPhotoData = "";

    showPhotoPreview("");

}


// ==========================================
// SAVE DRESS
// ==========================================

if (dressForm) {

    dressForm.addEventListener(
        "submit",
        saveDress
    );

}


async function saveDress(event) {

    event.preventDefault();


    const name =
        dressName.value.trim();


    if (!name) {

        alert(
            "Please enter the dress name."
        );

        return;

    }


    const category =
        dressCategory.value;


    if (!category) {

        alert(
            "Please select a category."
        );

        return;

    }


    const size =
        dressSize.value.trim();


    const price =
        Number(
            dressPrice.value
        ) || 0;


    const availability =
        dressAvailability.value;


    const color =
        dressColor.value.trim();


    const notes =
        dressNotes.value.trim();


    const now =
        new Date().toISOString();


    const fields = {

        name:
            firestoreValue(name),

        category:
            firestoreValue(category),

        size:
            firestoreValue(size),

        price:
            firestoreValue(price),

        availability:
            firestoreValue(availability),

        color:
            firestoreValue(color),

        notes:
            firestoreValue(notes),

        photo:
            firestoreValue(
                selectedPhotoData
            ),

        updatedAt:
            firestoreValue(now)

    };


    try {

        // ==================================
        // UPDATE
        // ==================================

        if (
            dressId &&
            dressId.value
        ) {

            /*
             * If no new photo was selected,
             * preserve the existing photo.
             */

            if (!selectedPhotoData) {

                const existingDress =
                    dresses.find(
                        item =>
                            item.id ===
                            dressId.value
                    );


                if (
                    existingDress &&
                    existingDress.photo
                ) {

                    fields.photo =
                        firestoreValue(
                            existingDress.photo
                        );

                }

            }


            const documentURL =
                `${FIRESTORE_URL}/${encodeURIComponent(dressId.value)}` +
                `?key=${API_KEY}`;


            const response =
                await fetch(
                    documentURL,
                    {

                        method: "PATCH",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields: fields
                            })

                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );

            }


            alert(
                "Dress updated successfully."
            );

        }


        // ==================================
        // CREATE
        // ==================================

        else {

            fields.createdAt =
                firestoreValue(now);


            const response =
                await fetch(
                    `${FIRESTORE_URL}?key=${API_KEY}`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                fields: fields
                            })

                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );

            }


            alert(
                "Dress added successfully."
            );

        }


        closeDressModal();

        await loadDresses();


    } catch (error) {

        console.error(
            "Save error:",
            error
        );


        showError(
            "Unable to save the dress.\n\n" +
            error.message
        );

    }

}


// ==========================================
// EDIT DRESS
// ==========================================

function editDress(id) {

    const dress =
        dresses.find(
            item =>
                item.id === id
        );


    if (!dress) {

        alert(
            "Dress not found."
        );

        return;

    }


    dressId.value =
        dress.id;

    dressName.value =
        dress.name;

    dressCategory.value =
        dress.category;

    dressSize.value =
        dress.size;

    dressPrice.value =
        dress.price;

    dressAvailability.value =
        dress.availability;

    dressColor.value =
        dress.color;

    dressNotes.value =
        dress.notes;


    selectedPhotoData =
        dress.photo || "";


    showPhotoPreview(
        dress.photo || ""
    );


    const modalTitle =
        document.getElementById(
            "modalTitle"
        );


    if (modalTitle) {

        modalTitle.textContent =
            "Edit Dress";

    }


    dressModal.classList.add(
        "active"
    );

}


// ==========================================
// DELETE DRESS
// ==========================================

async function removeDress(id) {

    const dress =
        dresses.find(
            item =>
                item.id === id
        );


    const name =
        dress
            ? dress.name
            : "this dress";


    if (
        !confirm(
            `Are you sure you want to delete "${name}"?\n\n` +
            "This action cannot be undone."
        )
    ) {

        return;

    }


    try {

        const documentURL =
            `${FIRESTORE_URL}/${encodeURIComponent(id)}` +
            `?key=${API_KEY}`;


        const response =
            await fetch(
                documentURL,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        alert(
            "Dress deleted successfully."
        );


        await loadDresses();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        showError(
            "Unable to delete the dress.\n\n" +
            error.message
        );

    }

}


// ==========================================
// SEARCH
// ==========================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderInventory
    );

}


// ==========================================
// FILTERS
// ==========================================

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


// ==========================================
// DASHBOARD STATS
// ==========================================

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


    const rented =
        dresses.filter(
            dress =>
                dress.availability ===
                "Rented"
        ).length;


    document.getElementById(
        "statTotal"
    ).textContent = total;


    document.getElementById(
        "statAvailable"
    ).textContent = available;


    document.getElementById(
        "statReserved"
    ).textContent = reserved;


    document.getElementById(
        "statRented"
    ).textContent = rented;

}


// ==========================================
// DASHBOARD RECENT
// ==========================================

function renderDashboardRecent() {

    const container =
        document.getElementById(
            "dashboardRecent"
        );


    if (!container) return;


    container.innerHTML = "";


    if (dresses.length === 0) {

        container.innerHTML = `

            <div class="recent-row">
                <span>No dresses added yet.</span>
            </div>

        `;

        return;

    }


    dresses
        .slice(0, 5)
        .forEach(dress => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "recent-row";


            row.innerHTML = `

                <div>

                    <strong>

                        ${escapeHTML(
                            dress.name
                        )}

                    </strong>

                    <div class="recent-category">

                        ${escapeHTML(
                            dress.category
                        )}

                    </div>

                </div>


                <span class="status ${getAvailabilityClass(dress.availability)}">

                    ${escapeHTML(
                        dress.availability
                    )}

                </span>

            `;


            container.appendChild(row);

        });

}


// ==========================================
// NAVIGATION
// ==========================================

function showSection(sectionName) {

    pageSections.forEach(section => {

        section.classList.remove(
            "active-section"
        );

    });


    const selected =
        document.getElementById(
            sectionName + "Section"
        );


    if (selected) {

        selected.classList.add(
            "active-section"
        );

    }


    navItems.forEach(item => {

        item.classList.remove(
            "active"
        );

    });


    const activeButton =
        document.querySelector(
            `[data-section="${sectionName}"]`
        );


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }


    if (pageTitles[sectionName]) {

        pageTitle.textContent =
            pageTitles[sectionName][0];

        pageSubtitle.textContent =
            pageTitles[sectionName][1];

    }


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }

}


navItems.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const sectionName =
                button.getAttribute(
                    "data-section"
                );


            showSection(
                sectionName
            );

        }
    );

});


// ==========================================
// VIEW ALL
// ==========================================

document
    .querySelectorAll("[data-go]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.getAttribute(
                        "data-go"
                    )
                );

            }
        );

    });


// ==========================================
// MOBILE MENU
// ==========================================

if (mobileMenu) {

    mobileMenu.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            if (sidebar) {

                sidebar.classList.toggle(
                    "open"
                );

            }

        }
    );

}


// ==========================================
// CLICK OUTSIDE SIDEBAR
// ==========================================

document.addEventListener(
    "click",
    event => {

        if (!sidebar) return;


        if (
            window.innerWidth > 1100
        ) return;


        if (
            sidebar.contains(
                event.target
            )
        ) return;


        if (
            mobileMenu &&
            mobileMenu.contains(
                event.target
            )
        ) return;


        sidebar.classList.remove(
            "open"
        );

    }
);


// ==========================================
// ESC KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeDressModal();

            sidebar.classList.remove(
                "open"
            );

        }

    }
);


// ==========================================
// HELPERS
// ==========================================

function getAvailabilityClass(status) {

    switch (status) {

        case "Available":
            return "available";

        case "Reserved":
            return "reserved";

        case "Rented":
            return "rented";

        case "Maintenance":
            return "maintenance";

        default:
            return "";

    }

}


function escapeHTML(value) {

    return String(value ?? "")

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

    return String(value ?? "")
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );

}


function showError(message) {

    console.error(message);

    alert(message);

}


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

window.editDress =
    editDress;

window.removeDress =
    removeDress;

window.closeDressModal =
    closeDressModal;


// ==========================================
// START
// ==========================================

showSection(
    "dashboard"
);

loadDresses();