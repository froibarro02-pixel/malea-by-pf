// ==========================================
// MALEA BY PF — ADMIN PANEL
// Firestore REST API + Cloudinary + Bulk Import
// ==========================================

const PROJECT_ID = "malea-by-pf";
const API_KEY = "AIzaSyCo6oYU8RpConNDMzBUs8CQyIfG2gm0kic";
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/dresses`;
const RESERVATIONS_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/reservations`;
let dresses = [];

// DOM ELEMENTS
const inventoryGrid = document.getElementById("inventoryGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const availabilityFilter = document.getElementById("availabilityFilter");

const dressModal = document.getElementById("dressModal");
const dressForm = document.getElementById("dressForm");
const dressId = document.getElementById("dressId");
const dressName = document.getElementById("dressName");
const dressCategory = document.getElementById("dressCategory");
const dressSize = document.getElementById("dressSize");
const dressPrice = document.getElementById("dressPrice");
const dressAvailability = document.getElementById("dressAvailability");
const dressColor = document.getElementById("dressColor");
const dressNotes = document.getElementById("dressNotes");
const dressImage = document.getElementById("dressImage");
const dressImagePreview = document.getElementById("dressImagePreview");
const saveDressButton = document.getElementById("saveDressButton");

// CLOUDINARY
const CLOUDINARY_CLOUD_NAME = "ln9ooopo";
const CLOUDINARY_UPLOAD_PRESET = "malea_dress_upload";
const CLOUDINARY_UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const MAX_DRESS_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_DRESS_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let currentDressImageUrl = "";
let currentDressImagePublicId = "";
let previewObjectUrl = "";

const sidebar = document.getElementById("sidebar");
const mobileMenu = document.getElementById("mobileMenu");

const navItems = [...document.querySelectorAll(".nav-item[data-section]")];
const pageSections = [...document.querySelectorAll(".section[id]")];

const pageTitles = {
    dashboard: ["Dashboard", "A quick overview of your rental business."],
    inventory: ["Dress Inventory", "Manage your dresses and rental availability."],
    reservations: ["Reservations", "Manage customer reservations."],
    customers: ["Customers", "Manage customer records."],
    calendar: ["Rental Calendar", "View your rental schedule."],
    payments: ["Payments", "Track rental payments and balances."],
    reports: ["Reports", "View inventory and rental reports."],
    settings: ["Settings", "Manage your admin settings."]
};


// ==========================================
// FIRESTORE HELPERS
// ==========================================

function firestoreValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return { doubleValue: value };
    }

    return { stringValue: String(value ?? "") };
}

function convertFirestoreDocument(document) {
    const fields = document.fields || {};

    return {
        id: document.name ? document.name.split("/").pop() : "",
        name: fields.name?.stringValue || "",
        category: fields.category?.stringValue || "",
        size: fields.size?.stringValue || "",
        price: Number(
            fields.price?.doubleValue ??
            fields.price?.integerValue ??
            0
        ),
        availability: fields.availability?.stringValue || "Available",
        color: fields.color?.stringValue || "",
        notes: fields.notes?.stringValue || "",
        imageUrl:
            fields.imageUrl?.stringValue ||
            fields.photoUrl?.stringValue ||
            fields.imageURL?.stringValue ||
            "",
        imagePublicId: fields.imagePublicId?.stringValue || "",
        createdAt: fields.createdAt?.stringValue || "",
        updatedAt: fields.updatedAt?.stringValue || ""
    };
}


// ==========================================
// LOAD DRESSES
// ==========================================

async function loadDresses() {
    try {
        const response = await fetch(`${FIRESTORE_URL}?key=${API_KEY}`);

        if (!response.ok) {
            throw new Error(
                `Firestore ${response.status}: ${await response.text()}`
            );
        }

        const data = await response.json();

        dresses = (data.documents || []).map(convertFirestoreDocument);

        updateCategorySuggestions();
        renderInventory();
        updateDashboardStats();
        renderDashboardRecent();

        console.log("Dresses loaded:", dresses);

    } catch (error) {
        console.error("Firestore load error:", error);
        showError(
            "Unable to load the dress inventory.\n\n" + error.message
        );
    }
}


// ==========================================
// CATEGORY AUTOCOMPLETE
// ==========================================

function updateCategorySuggestions() {
    const suggestions = document.getElementById("categorySuggestions");

    if (!suggestions) return;

    const uniqueCategories = new Map();

    dresses.forEach(dress => {
        const category = String(dress.category || "").trim();

        if (!category) return;

        const key = category.toLocaleLowerCase();

        if (!uniqueCategories.has(key)) {
            uniqueCategories.set(key, category);
        }
    });

    suggestions.replaceChildren();

    [...uniqueCategories.values()]
        .sort((a, b) => a.localeCompare(b))
        .forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            suggestions.appendChild(option);
        });
}


// ==========================================
// INVENTORY RENDERING
// ==========================================

function renderInventory() {
    if (!inventoryGrid) return;

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const selectedCategory = categoryFilter?.value || "";
    const selectedAvailability = availabilityFilter?.value || "";

    const filteredDresses = dresses.filter(dress => {
        const matchesSearch =
            !searchTerm ||
            (dress.name || "").toLowerCase().includes(searchTerm) ||
            (dress.category || "").toLowerCase().includes(searchTerm) ||
            (dress.color || "").toLowerCase().includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            dress.category === selectedCategory;

        const matchesAvailability =
            !selectedAvailability ||
            dress.availability === selectedAvailability;

        return matchesSearch && matchesCategory && matchesAvailability;

    }).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
            numeric: true,
            sensitivity: "base"
        })
    );

    inventoryGrid.innerHTML = "";

    if (emptyState) {
        emptyState.style.display =
            filteredDresses.length ? "none" : "block";
    }

    filteredDresses.forEach(dress => {
        const card = document.createElement("article");
        card.className = "dress-card";

        const safeImageUrl = getSafeImageUrl(dress.imageUrl);

        card.innerHTML = `
            <div class="dress-card-image">
                ${safeImageUrl
                ? `<img
                        src="${escapeHTML(safeImageUrl)}"
                        alt="${escapeHTML(dress.name || "Dress photo")}"
                        loading="lazy"
                    >`
                : `<div class="dress-card-image-placeholder">
                        No dress photo
                    </div>`
            }
            </div>

            <div class="dress-card-content">

                <div class="dress-card-header">
                    <h3>${escapeHTML(dress.name || "Unnamed Dress")}</h3>

                    <span class="availability-badge ${getAvailabilityClass(dress.availability)}">
                        ${escapeHTML(dress.availability || "Available")}
                    </span>
                </div>

                <div class="dress-details">
                    <p><strong>Category</strong><span>${escapeHTML(dress.category || "-")}</span></p>
                    <p><strong>Size</strong><span>${escapeHTML(dress.size || "-")}</span></p>
                    <p><strong>Color</strong><span>${escapeHTML(dress.color || "-")}</span></p>
                    <p><strong>Rental Price</strong><span>₱${Number(dress.price || 0).toLocaleString()}</span></p>
                </div>

                ${dress.notes
                ? `<div class="dress-notes">
                        ${escapeHTML(dress.notes)}
                    </div>`
                : ""
            }

                <div class="dress-actions">
                    <button
                        type="button"
                        class="btn-edit"
                        data-edit-dress="${escapeHTML(dress.id)}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn-delete"
                        data-delete-dress="${escapeHTML(dress.id)}">
                        Delete
                    </button>
                </div>

            </div>
        `;

        inventoryGrid.appendChild(card);
    });
}



// ==========================================
// DASHBOARD RECENT INVENTORY
// ==========================================

function renderDashboardRecent() {
    const container = document.getElementById("dashboardRecent");

    if (!container) return;

    const recent = [...dresses].slice(-5).reverse();

    if (!recent.length) {
        container.innerHTML =
            '<p class="muted">No dresses added yet.</p>';
        return;
    }

    container.innerHTML = recent.map(dress => `
        <div class="recent-row">
            <strong>${escapeHTML(dress.name || "Unnamed Dress")}</strong>
            <span>${escapeHTML(dress.availability || "Available")}</span>
        </div>
    `).join("");
}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateDashboardStats() {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("statTotal", dresses.length);

    setText(
        "statAvailable",
        dresses.filter(d => d.availability === "Available").length
    );

    setText(
        "statReserved",
        dresses.filter(d => d.availability === "Reserved").length
    );

    setText(
        "statRented",
        dresses.filter(d => d.availability === "Rented").length
    );
}


// ==========================================
// SAFE IMAGE URL
// ==========================================

function getSafeImageUrl(url) {
    if (!url) return "";

    try {
        const parsed = new URL(url);

        if (parsed.protocol !== "https:") return "";

        return parsed.href;
    } catch {
        return "";
    }
}


// ==========================================
// CLOUDINARY IMAGE UPLOAD
// ==========================================

async function uploadDressImage(file) {
    if (!file) return null;

    if (!ALLOWED_DRESS_IMAGE_TYPES.includes(file.type)) {
        throw new Error("Please upload JPG, PNG, or WEBP images only.");
    }

    if (file.size > MAX_DRESS_IMAGE_SIZE) {
        throw new Error("Image must not exceed 5 MB.");
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "malea-dresses");

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error?.message || "Cloudinary upload failed."
        );
    }

    return {
        url: result.secure_url,
        publicId: result.public_id
    };
}


// ==========================================
// IMAGE PREVIEW
// ==========================================

function clearImagePreviewUrl() {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
    }
}

function showImagePreview(url) {
    if (!dressImagePreview) return;

    dressImagePreview.innerHTML = "";

    if (!url) {
        dressImagePreview.innerHTML =
            "<span>Dress photo preview</span>";
        return;
    }

    const image = document.createElement("img");
    image.src = url;
    image.alt = "Dress preview";

    dressImagePreview.appendChild(image);
}

if (dressImage) {
    dressImage.addEventListener("change", () => {
        const file = dressImage.files?.[0];

        clearImagePreviewUrl();

        if (!file) {
            showImagePreview(currentDressImageUrl);
            return;
        }

        if (!ALLOWED_DRESS_IMAGE_TYPES.includes(file.type)) {
            showError("Please select a JPG, PNG, or WEBP image.");
            dressImage.value = "";
            showImagePreview(currentDressImageUrl);
            return;
        }

        if (file.size > MAX_DRESS_IMAGE_SIZE) {
            showError("Image must not exceed 5 MB.");
            dressImage.value = "";
            showImagePreview(currentDressImageUrl);
            return;
        }

        previewObjectUrl = URL.createObjectURL(file);
        showImagePreview(previewObjectUrl);
    });
}


// ==========================================
// OPEN ADD DRESS MODAL
// ==========================================

function openAddDressModal() {
    if (!dressForm || !dressModal) return;

    dressForm.reset();

    dressId.value = "";
    currentDressImageUrl = "";
    currentDressImagePublicId = "";

    clearImagePreviewUrl();
    showImagePreview("");

    const title = document.getElementById("modalTitle");

    if (title) title.textContent = "Add Dress";

    dressModal.classList.add("active");
    dressModal.setAttribute("aria-hidden", "false");
}


// ==========================================
// CLOSE DRESS MODAL
// ==========================================

function closeDressModal() {
    if (!dressModal) return;

    dressModal.classList.remove("active");
    dressModal.setAttribute("aria-hidden", "true");

    clearImagePreviewUrl();

    if (dressImage) dressImage.value = "";
}


// ==========================================
// EDIT DRESS
// ==========================================

function editDress(id) {
    const dress = dresses.find(item => item.id === id);

    if (!dress) {
        showError("Dress record not found.");
        return;
    }

    dressId.value = dress.id;
    dressName.value = dress.name || "";
    dressCategory.value = dress.category || "";
    dressSize.value = dress.size || "";
    dressPrice.value = dress.price || "";
    dressAvailability.value = dress.availability || "Available";
    dressColor.value = dress.color || "";
    dressNotes.value = dress.notes || "";

    currentDressImageUrl = dress.imageUrl || "";
    currentDressImagePublicId = dress.imagePublicId || "";

    if (dressImage) dressImage.value = "";

    clearImagePreviewUrl();
    showImagePreview(currentDressImageUrl);

    const title = document.getElementById("modalTitle");

    if (title) title.textContent = "Edit Dress";

    dressModal.classList.add("active");
    dressModal.setAttribute("aria-hidden", "false");
}


// ==========================================
// DELETE DRESS
// ==========================================

async function removeDress(id) {
    const dress = dresses.find(item => item.id === id);

    if (!dress) return;

    const confirmed = confirm(
        `Are you sure you want to delete "${dress.name}"?`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${FIRESTORE_URL}/${encodeURIComponent(id)}?key=${API_KEY}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            throw new Error(
                `Firestore ${response.status}: ${await response.text()}`
            );
        }

        alert("Dress deleted successfully.");

        await loadDresses();

    } catch (error) {
        console.error("Delete error:", error);
        showError("Unable to delete dress.\n\n" + error.message);
    }
}


// ==========================================
// SAVE DRESS
// ==========================================

async function saveDress(event) {
    event.preventDefault();

    const editingId = dressId.value.trim();

    const name = dressName.value.trim();
    const category = dressCategory.value.trim();
    const size = dressSize.value.trim();
    const price = Number(dressPrice.value || 0);
    const availability = dressAvailability.value;
    const color = dressColor.value.trim();
    const notes = dressNotes.value.trim();

    if (!name || !category) {
        showError("Please enter the dress name and category.");
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        showError("Please enter a valid rental price.");
        return;
    }

    if (saveDressButton) {
        saveDressButton.disabled = true;
        saveDressButton.textContent = "Saving...";
    }

    try {
        let imageUrl = currentDressImageUrl;
        let imagePublicId = currentDressImagePublicId;

        const selectedFile = dressImage?.files?.[0];

        if (selectedFile) {
            const uploaded = await uploadDressImage(selectedFile);
            imageUrl = uploaded.url;
            imagePublicId = uploaded.publicId;
        }

        const now = new Date().toISOString();

        const fields = {
            name: firestoreValue(name),
            category: firestoreValue(category),
            size: firestoreValue(size),
            price: firestoreValue(price),
            availability: firestoreValue(availability),
            color: firestoreValue(color),
            notes: firestoreValue(notes),
            imageUrl: firestoreValue(imageUrl),
            imagePublicId: firestoreValue(imagePublicId),
            updatedAt: firestoreValue(now)
        };

        let response;

        if (editingId) {
            response = await fetch(
                `${FIRESTORE_URL}/${encodeURIComponent(editingId)}?key=${API_KEY}&updateMask.fieldPaths=name&updateMask.fieldPaths=category&updateMask.fieldPaths=size&updateMask.fieldPaths=price&updateMask.fieldPaths=availability&updateMask.fieldPaths=color&updateMask.fieldPaths=notes&updateMask.fieldPaths=imageUrl&updateMask.fieldPaths=imagePublicId&updateMask.fieldPaths=updatedAt`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fields })
                }
            );
        } else {
            fields.createdAt = firestoreValue(now);

            response = await fetch(
                `${FIRESTORE_URL}?key=${API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fields })
                }
            );
        }

        if (!response.ok) {
            throw new Error(
                `Firestore ${response.status}: ${await response.text()}`
            );
        }

        alert(
            editingId
                ? "Dress updated successfully."
                : "Dress added successfully."
        );

        closeDressModal();
        await loadDresses();

    } catch (error) {
        console.error("Save error:", error);
        showError("Unable to save the dress.\n\n" + error.message);

    } finally {
        if (saveDressButton) {
            saveDressButton.disabled = false;
            saveDressButton.textContent = "Save Dress";
        }
    }
}


// ==========================================
// BULK IMPORT ELEMENTS
// ==========================================

const bulkImportModal = document.getElementById("bulkImportModal");
const openBulkImportButton = document.getElementById("openBulkImport");
const bulkImportFile = document.getElementById("bulkImportFile");
const bulkImportStatus = document.getElementById("bulkImportStatus");
const bulkImportPreview = document.getElementById("bulkImportPreview");
const confirmBulkImportButton = document.getElementById("confirmBulkImport");

let bulkImportRows = [];

const LAST_IMPORT_STORAGE_KEY = "malea_last_bulk_import_ids";

let lastImportedDressIds = [];

function loadLastImportHistory() {
    try {
        const saved = localStorage.getItem(LAST_IMPORT_STORAGE_KEY);
        lastImportedDressIds = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(lastImportedDressIds)) {
            lastImportedDressIds = [];
        }
    } catch (error) {
        console.error("Unable to load import history:", error);
        lastImportedDressIds = [];
    }

    updateUndoImportButton();
}

function saveLastImportHistory() {
    try {
        localStorage.setItem(
            LAST_IMPORT_STORAGE_KEY,
            JSON.stringify(lastImportedDressIds)
        );
    } catch (error) {
        console.error("Unable to save import history:", error);
    }

    updateUndoImportButton();
}

function updateUndoImportButton() {
    const button = document.getElementById("undoLastImportButton");

    if (!button) return;

    button.disabled = lastImportedDressIds.length === 0;

    button.textContent = lastImportedDressIds.length
        ? `↶ Undo Last Import (${lastImportedDressIds.length})`
        : "↶ Undo Last Import";
}


// ==========================================
// OPEN / CLOSE BULK IMPORT MODAL
// ==========================================

function openBulkImportModal() {
    if (!bulkImportModal) return;

    bulkImportModal.classList.add("active");
    bulkImportModal.setAttribute("aria-hidden", "false");
}

function closeBulkImportModal() {
    if (!bulkImportModal) return;

    bulkImportModal.classList.remove("active");
    bulkImportModal.setAttribute("aria-hidden", "true");
}


// ==========================================
// BULK IMPORT STATUS
// ==========================================

function setBulkImportStatus(message, type = "") {
    if (!bulkImportStatus) return;

    bulkImportStatus.textContent = message;
    bulkImportStatus.className = "bulk-import-status";

    if (type) {
        bulkImportStatus.classList.add(type);
    }
}


// ==========================================
// NORMALIZE SPREADSHEET HEADERS
// ==========================================
// ==========================================
// NORMALIZE SPREADSHEET HEADERS
// ==========================================

function normalizeHeader(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/₱/g, "php")
        .replace(/[^a-z0-9]/g, "");
}

function cleanCell(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "object") {
        if (value.text !== undefined) return String(value.text).trim();
        if (value.result !== undefined) return String(value.result).trim();

        if (value.richText) {
            return value.richText
                .map(part => part.text || "")
                .join("")
                .trim();
        }
    }

    return String(value).trim();
}

function parsePrice(value) {
    if (typeof value === "number") return value;

    const cleaned = String(value || "")
        .replace(/[₱,\s]/g, "")
        .replace(/[^\d.-]/g, "");

    if (!cleaned) return 0;

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getExcelCell(row, headerMap, possibleHeaders) {
    for (const header of possibleHeaders) {
        const column = headerMap.get(normalizeHeader(header));

        if (column !== undefined) {
            return cleanCell(row.getCell(column).value);
        }
    }

    return "";
}



function getCell(row, possibleHeaders) {
    if (!row) return "";

    for (const header of possibleHeaders) {
        const targetHeader = normalizeHeader(header);

        const matchingKey = Object.keys(row).find(
            key => normalizeHeader(key) === targetHeader
        );

        if (matchingKey !== undefined) {
            return row[matchingKey];
        }
    }

    return "";
}

function convertExcelRow(row, headerMap, rowNumber) {
    const code = getExcelCell(row, headerMap, [
        "Dress Code",
        "Dress Name/Code",
        "Dress Name",
        "Code",
        "SKU"
    ]);

    const category = getExcelCell(
        row, headerMap, ["Category", "Dress Category", "Type"]
    );

    const size = getExcelCell(
        row, headerMap, ["Size", "Size & Fits", "Size and Fits"]
    );

    const bust = getExcelCell(row, headerMap, ["Bust"]);
    const waist = getExcelCell(row, headerMap, ["Waist"]);
    const length = getExcelCell(row, headerMap, ["Length"]);

    const price = parsePrice(
        getExcelCell(row, headerMap, [
            "Price (PHP)", "Price", "Rental Price", "Amount"
        ])
    );

    const duration = getExcelCell(row, headerMap, [
        "Rental Duration (Days)",
        "Rental Duration",
        "Duration"
    ]) || "3";

    const color = getExcelCell(
        row, headerMap, ["Color", "Dress Color"]
    );

    const notes = getExcelCell(
        row, headerMap, ["Notes", "Remarks", "Description"]
    );

    const measurements = [
        bust ? `Bust: ${bust}` : "",
        waist ? `Waist: ${waist}` : "",
        length ? `Length: ${length}` : ""
    ].filter(Boolean).join(" | ");

    return {
        rowNumber,
        code,
        name: code,
        category,
        size,
        price,
        availability: "Available",
        color,
        notes: [
            notes,
            measurements,
            `Rental duration: ${duration} days`
        ].filter(Boolean).join(" | "),
        imageFile: null,
        imageUrl: "",
        imagePublicId: ""
    };
}


// ==========================================
// READ EXCEL AND EXTRACT EMBEDDED PHOTOS
// ==========================================


async function readBulkImportFile(file) {
    if (!file) return;

    if (typeof XLSX === "undefined" || typeof JSZip === "undefined") {
        showError("The spreadsheet libraries did not load. Refresh the page and try again.");
        return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    if (extension !== "xlsx") {
        showError("Please upload an XLSX workbook.");
        return;
    }

    try {
        setBulkImportStatus("Reading spreadsheet and extracting photos...", "");

        bulkImportPreview.innerHTML = "";
        confirmBulkImportButton.disabled = true;

        const buffer = await file.arrayBuffer();

        // Read spreadsheet data using SheetJS.
        const workbook = XLSX.read(buffer, {
            type: "array",
            cellDates: true
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error("No worksheet was found.");
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false
        });

        if (!rawRows.length) {
            throw new Error("The spreadsheet contains no data rows.");
        }

        bulkImportRows = rawRows
            .map((row, index) => convertImportRow(row, index))
            .filter(row => row.code);

        if (!bulkImportRows.length) {
            throw new Error("No dress records with a Dress Code were found.");
        }

        // Open XLSX as ZIP to extract embedded photos.
        const zip = await JSZip.loadAsync(buffer);

        const parser = new DOMParser();
        const ns = {
            main: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            rel: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            pkg: "http://schemas.openxmlformats.org/package/2006/relationships",
            drawing: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
            drawingMain: "http://schemas.openxmlformats.org/drawingml/2006/main"
        };

        function getZipPath(target, baseFolder) {
            if (target.startsWith("/")) {
                return target.replace(/^\/+/, "");
            }

            const parts = baseFolder.split("/").filter(Boolean);

            target.split("/").forEach(part => {
                if (part === "..") {
                    parts.pop();
                } else if (part && part !== ".") {
                    parts.push(part);
                }
            });

            return parts.join("/");
        }

        async function readXml(path) {
            const entry = zip.file(path);

            if (!entry) {
                throw new Error(`Workbook component not found: ${path}`);
            }

            const xml = await entry.async("string");
            return parser.parseFromString(xml, "application/xml");
        }

        // Locate the first worksheet XML.
        const workbookXml = await readXml("xl/workbook.xml");
        const workbookRels = await readXml("xl/_rels/workbook.xml.rels");

        const firstSheet = workbookXml.getElementsByTagNameNS(
            ns.main,
            "sheet"
        )[0];

        if (!firstSheet) {
            throw new Error("The workbook has no worksheet.");
        }

        const sheetRelId = firstSheet.getAttributeNS(ns.rel, "id");

        const sheetRelationship = [
            ...workbookRels.getElementsByTagNameNS(ns.pkg, "Relationship")
        ].find(rel => rel.getAttribute("Id") === sheetRelId);

        if (!sheetRelationship) {
            throw new Error("Unable to locate the worksheet relationship.");
        }

        const sheetPath = getZipPath(
            sheetRelationship.getAttribute("Target"),
            "xl"
        );

        const sheetFolder = sheetPath.substring(
            0,
            sheetPath.lastIndexOf("/")
        );

        const sheetFileName = sheetPath.split("/").pop();

        const sheetRelsPath =
            `${sheetFolder}/_rels/${sheetFileName}.rels`;

        const sheetRelsEntry = zip.file(sheetRelsPath);

        if (sheetRelsEntry) {
            const sheetRelsXml = await readXml(sheetRelsPath);

            const drawingRelationship = [
                ...sheetRelsXml.getElementsByTagNameNS(ns.pkg, "Relationship")
            ].find(rel =>
                (rel.getAttribute("Type") || "").endsWith("/drawing")
            );

            if (drawingRelationship) {
                const drawingPath = getZipPath(
                    drawingRelationship.getAttribute("Target"),
                    sheetFolder
                );

                const drawingFolder = drawingPath.substring(
                    0,
                    drawingPath.lastIndexOf("/")
                );

                const drawingFileName = drawingPath.split("/").pop();

                const drawingRelsPath =
                    `${drawingFolder}/_rels/${drawingFileName}.rels`;

                const drawingXml = await readXml(drawingPath);
                const drawingRelsXml = await readXml(drawingRelsPath);

                const imageRelationships = new Map();

                [
                    ...drawingRelsXml.getElementsByTagNameNS(
                        ns.pkg,
                        "Relationship"
                    )
                ].forEach(rel => {
                    imageRelationships.set(
                        rel.getAttribute("Id"),
                        getZipPath(
                            rel.getAttribute("Target"),
                            drawingFolder
                        )
                    );
                });

                const rowLookup = new Map(
                    bulkImportRows.map(row => [row.rowNumber, row])
                );

                const anchors = [
                    ...drawingXml.getElementsByTagNameNS(
                        ns.drawing,
                        "oneCellAnchor"
                    ),
                    ...drawingXml.getElementsByTagNameNS(
                        ns.drawing,
                        "twoCellAnchor"
                    )
                ];

                const imageExtensions = {
                    jpg: "image/jpeg",
                    jpeg: "image/jpeg",
                    png: "image/png",
                    webp: "image/webp"
                };

                for (const anchor of anchors) {
                    const from = anchor.getElementsByTagNameNS(
                        ns.drawing,
                        "from"
                    )[0];

                    if (!from) continue;

                    const rowElement = from.getElementsByTagNameNS(
                        ns.drawing,
                        "row"
                    )[0];

                    if (!rowElement) continue;

                    // Drawing XML rows are zero-based.
                    // Spreadsheet row numbers are one-based.
                    const rowNumber =
                        Number(rowElement.textContent) + 1;

                    const dress = rowLookup.get(rowNumber);

                    if (!dress) continue;

                    const blip = anchor.getElementsByTagNameNS(
                        ns.drawingMain,
                        "blip"
                    )[0];

                    if (!blip) continue;

                    const relationshipId =
                        blip.getAttributeNS(ns.rel, "embed") ||
                        blip.getAttribute("r:embed");

                    const imagePath =
                        imageRelationships.get(relationshipId);

                    if (!imagePath) continue;

                    const imageEntry = zip.file(imagePath);

                    if (!imageEntry) continue;

                    const extension = imagePath
                        .split(".")
                        .pop()
                        .toLowerCase();

                    const mimeType = imageExtensions[extension];

                    if (!mimeType) continue;

                    const imageBlob = await imageEntry.async("blob");

                    dress.imageFile = new File(
                        [imageBlob],
                        `${dress.code}.${extension}`,
                        { type: mimeType }
                    );
                }
            }
        }

        renderBulkImportPreview();

        const photoCount = bulkImportRows.filter(
            row => row.imageFile
        ).length;

        setBulkImportStatus(
            `${bulkImportRows.length} dress records found. ${photoCount} embedded photo(s) detected.`,
            "success"
        );

    } catch (error) {
        console.error("Spreadsheet read error:", error);

        bulkImportRows = [];

        if (confirmBulkImportButton) {
            confirmBulkImportButton.disabled = true;
        }

        setBulkImportStatus(
            "Unable to read spreadsheet: " + error.message,
            "error"
        );
    }
}



// ==========================================
// CONVERT SPREADSHEET ROW
// ==========================================

function convertImportRow(row, index) {
    const code = cleanCell(
        getCell(row, [
            "Dress Code",
            "Dress Name/Code",
            "Dress Name",
            "Code",
            "SKU"
        ])
    );

    const category = cleanCell(
        getCell(row, ["Category", "Dress Category", "Type"])
    );

    const size = cleanCell(
        getCell(row, ["Size", "Size & Fits", "Size and Fits"])
    );

    const bust = cleanCell(getCell(row, ["Bust"]));
    const waist = cleanCell(getCell(row, ["Waist"]));
    const length = cleanCell(getCell(row, ["Length"]));

    const price = parsePrice(
        getCell(row, ["Price (PHP)", "Price", "Rental Price", "Amount"])
    );

    const duration = cleanCell(
        getCell(row, [
            "Rental Duration (Days)",
            "Rental Duration",
            "Duration"
        ])
    ) || "3";

    const color = cleanCell(
        getCell(row, ["Color", "Dress Color"])
    );

    const notes = cleanCell(
        getCell(row, ["Notes", "Remarks", "Description"])
    );

    const measurements = [
        bust ? `Bust: ${bust}` : "",
        waist ? `Waist: ${waist}` : "",
        length ? `Length: ${length}` : ""
    ].filter(Boolean).join(" | ");

    const combinedNotes = [
        notes,
        measurements,
        `Rental duration: ${duration} days`
    ].filter(Boolean).join(" | ");

    return {
        rowNumber: index + 2,
        code,
        name: code,
        category,
        size,
        price,
        availability: "Available",
        color,
        notes: combinedNotes,
        imageUrl: "",
        imagePublicId: ""
    };
}


// ==========================================
// PREVIEW BULK IMPORT
// ==========================================

// ==========================================
// PREVIEW BULK IMPORT
// ==========================================

function renderBulkImportPreview() {
    if (!bulkImportPreview) return;

    if (!bulkImportRows.length) {
        bulkImportPreview.innerHTML = "";
        return;
    }

    const existingCodes = new Set(
        dresses.map(dress => dress.name.trim().toLowerCase())
    );

    const fileCodes = new Set();

    const rowsWithStatus = bulkImportRows.map(row => {
        const normalizedCode = String(row.code || "").trim().toLowerCase();

        const duplicate =
            existingCodes.has(normalizedCode) ||
            fileCodes.has(normalizedCode);

        if (normalizedCode) {
            fileCodes.add(normalizedCode);
        }

        return {
            ...row,
            duplicate,
            invalid: !normalizedCode
        };
    });

    const validRows = rowsWithStatus.filter(
        row => !row.duplicate && !row.invalid
    );

    const duplicateCount = rowsWithStatus.filter(
        row => row.duplicate
    ).length;

    const invalidCount = rowsWithStatus.filter(
        row => row.invalid
    ).length;

    bulkImportPreview.innerHTML = `
        <div class="bulk-import-summary">
            <div>
                <strong>${rowsWithStatus.length}</strong>
                <span>Total rows</span>
            </div>
            <div>
                <strong>${validRows.length}</strong>
                <span>Ready to import</span>
            </div>
            <div>
                <strong>${duplicateCount}</strong>
                <span>Duplicates</span>
            </div>
            <div>
                <strong>${invalidCount}</strong>
                <span>Invalid</span>
            </div>
        </div>

        <div class="bulk-table-wrap">
            <table class="bulk-table">
                <thead>
                    <tr>
                        <th>Dress Code</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Price</th>
                        <th>Color</th>
                        <th>Photo</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    ${rowsWithStatus.map(row => `
                        <tr>
                            <td>
                                ${escapeHTML(row.code || "Missing code")}
                            </td>

                            <td>
                                ${escapeHTML(row.category || "-")}
                            </td>

                            <td>
                                ${escapeHTML(row.size || "-")}
                            </td>

                            <td>
                                ₱${Number(row.price || 0).toLocaleString()}
                            </td>

                            <td>
                                ${escapeHTML(row.color || "-")}
                            </td>

                            <td>
                                ${row.imageFile
            ? `<img
                                            src="${URL.createObjectURL(row.imageFile)}"
                                            alt="Dress photo"
                                            style="width:55px;height:65px;object-fit:cover;border-radius:6px;"
                                           >`
            : '<span>No photo</span>'
        }
                            </td>

                            <td>
                                ${row.invalid
            ? '<span class="import-status invalid">Missing code</span>'
            : row.duplicate
                ? '<span class="import-status duplicate">Duplicate</span>'
                : '<span class="import-status ready">Ready</span>'
        }
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    if (confirmBulkImportButton) {
        confirmBulkImportButton.disabled = validRows.length === 0;
        confirmBulkImportButton.textContent =
            `Import ${validRows.length} Dresses`;
    }

    setBulkImportStatus(
        `${validRows.length} dress(es) ready. ${duplicateCount} duplicate(s) and ${invalidCount} invalid row(s) will be skipped.`,
        validRows.length ? "success" : "warning"
    );
}



// ==========================================
// IMPORT ONE DRESS TO FIRESTORE
// ==========================================

// ==========================================
// IMPORT ONE DRESS TO FIRESTORE
// ==========================================

async function importOneDress(row) {
    let imageUrl = "";
    let imagePublicId = "";

    if (row.imageFile) {
        const uploaded = await uploadDressImage(row.imageFile);

        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
    }

    const now = new Date().toISOString();

    const fields = {
        name: firestoreValue(row.name),
        category: firestoreValue(row.category),
        size: firestoreValue(row.size),
        price: firestoreValue(row.price),
        availability: firestoreValue(row.availability),
        color: firestoreValue(row.color),
        notes: firestoreValue(row.notes),
        imageUrl: firestoreValue(imageUrl),
        imagePublicId: firestoreValue(imagePublicId),
        createdAt: firestoreValue(now),
        updatedAt: firestoreValue(now)
    };

    const response = await fetch(
        `${FIRESTORE_URL}?key=${API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ fields })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to import ${row.code}: ${response.status} ${await response.text()}`
        );
    }

    return response.json();
}


// ==========================================
// CONFIRM BULK IMPORT
// ==========================================

async function confirmBulkImport() {
    if (!bulkImportRows.length) {
        showError("Please select a spreadsheet first.");
        return;
    }

    const existingCodes = new Set(
        dresses.map(dress => dress.name.trim().toLowerCase())
    );

    const fileCodes = new Set();

    const validRows = bulkImportRows.filter(row => {
        const code = row.code.trim().toLowerCase();

        if (!code || existingCodes.has(code) || fileCodes.has(code)) {
            return false;
        }

        fileCodes.add(code);
        return true;
    });

    if (!validRows.length) {
        setBulkImportStatus("There are no valid dresses to import.", "warning");
        return;
    }

    const confirmed = confirm(
        `Import ${validRows.length} dress(es) into your inventory?\n\n` +
        "Duplicate and invalid rows will be skipped."
    );

    if (!confirmed) return;

    if (confirmBulkImportButton) {
        confirmBulkImportButton.disabled = true;
        confirmBulkImportButton.textContent = "Importing...";
    }

    setBulkImportStatus(
        `Importing ${validRows.length} dress(es)...`,
        ""
    );

    // Start a new undo history for this import.
    lastImportedDressIds = [];
    saveLastImportHistory();

    let importedCount = 0;
    const errors = [];

    for (const row of validRows) {
        try {
            const result = await importOneDress(row);
            const documentId = result.name?.split("/").pop();

            if (documentId) {
                lastImportedDressIds.push(documentId);
                saveLastImportHistory();
            }

            importedCount++;

            setBulkImportStatus(
                `Importing... ${importedCount} of ${validRows.length}`,
                ""
            );

        } catch (error) {
            console.error(`Import failed for ${row.code}:`, error);
            errors.push(`${row.code}: ${error.message}`);
        }
    }

    await loadDresses();

    if (confirmBulkImportButton) {
        confirmBulkImportButton.disabled = false;
        confirmBulkImportButton.textContent = "Import Dresses";
    }

    if (importedCount > 0) {
        const message =
            `${importedCount} dress(es) imported successfully.` +
            (errors.length
                ? ` ${errors.length} row(s) failed.`
                : "");

        setBulkImportStatus(message, errors.length ? "warning" : "success");

        alert(
            `${message}\n\n` +
            "You can use Undo Last Import to remove the records created by this import."
        );

        closeBulkImportModal();

        bulkImportRows = [];

        if (bulkImportFile) bulkImportFile.value = "";
        if (bulkImportPreview) bulkImportPreview.innerHTML = "";

    } else {
        setBulkImportStatus(
            "No dresses were imported. Check the errors and try again.",
            "error"
        );

        alert(
            "No dresses were imported.\n\n" +
            errors.join("\n")
        );
    }

    updateUndoImportButton();
}


// ==========================================
// UNDO LAST BULK IMPORT
// ==========================================

async function undoLastImport() {
    if (!lastImportedDressIds.length) {
        alert("There is no recent import to undo.");
        return;
    }

    const count = lastImportedDressIds.length;

    const confirmed = confirm(
        `Are you sure you want to undo the last import?\n\n` +
        `${count} imported dress record(s) will be deleted from Firestore.\n\n` +
        "This action cannot be reversed."
    );

    if (!confirmed) return;

    const button = document.getElementById("undoLastImportButton");

    if (button) {
        button.disabled = true;
        button.textContent = "Undoing Import...";
    }

    const idsToDelete = [...lastImportedDressIds];
    const failedIds = [];

    let deleted = 0;

    for (const id of idsToDelete) {
        try {
            const response = await fetch(
                `${FIRESTORE_URL}/${encodeURIComponent(id)}?key=${API_KEY}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Firestore ${response.status}: ${await response.text()}`
                );
            }

            deleted++;

        } catch (error) {
            console.error(`Unable to undo document ${id}:`, error);
            failedIds.push(id);
        }
    }

    lastImportedDressIds = failedIds;
    saveLastImportHistory();

    await loadDresses();

    if (failedIds.length === 0) {
        alert(
            `Undo successful!\n\n` +
            `${deleted} imported dress record(s) were removed.`
        );
    } else {
        alert(
            `Undo partially completed.\n\n` +
            `Successfully deleted: ${deleted}\n` +
            `Failed to delete: ${failedIds.length}\n\n` +
            "You can click Undo Last Import again to retry the remaining records."
        );
    }
}


// ==========================================
// NAVIGATION
// ==========================================

function showSection(sectionName) {
    const selectedSection =
        document.getElementById(`${sectionName}Section`);

    if (!selectedSection || !pageSections.includes(selectedSection)) {
        console.error("Section not found:", `${sectionName}Section`);
        return;
    }

    pageSections.forEach(section => {
        section.style.display = "none";
        section.classList.remove("active-section");
    });

    selectedSection.style.display = "block";
    selectedSection.classList.add("active-section");

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.section === sectionName
        );
    });

    const [title, subtitle] =
        pageTitles[sectionName] || [sectionName, ""];

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");

    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;

    // Load reservations when the Reservations section is opened
    if (sectionName === "reservations") {
        loadReservations();
    }

    sidebar?.classList.remove("open");
    document.body.classList.remove("sidebar-open");
}


// ==========================================
// EVENT LISTENERS
// Reservation Event Listeners
document.getElementById("reservationSearch")
    ?.addEventListener("input", renderReservations);

document.getElementById("reservationStatusFilter")
    ?.addEventListener("change", renderReservations);

document.getElementById("refreshReservationsButton")
    ?.addEventListener("click", loadReservations);
// ADD DRESS BUTTONS
document.querySelectorAll("[data-open-add]").forEach(button => {
    button.addEventListener("click", openAddDressModal);
});


// CLOSE DRESS MODAL
document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", closeDressModal);
});


// DRESS FORM
if (dressForm) {
    dressForm.addEventListener("submit", saveDress);
}


// EDIT / DELETE BUTTONS
if (inventoryGrid) {
    inventoryGrid.addEventListener("click", event => {
        const editButton = event.target.closest("[data-edit-dress]");
        const deleteButton = event.target.closest("[data-delete-dress]");

        if (editButton) {
            editDress(editButton.dataset.editDress);
        }

        if (deleteButton) {
            removeDress(deleteButton.dataset.deleteDress);
        }
    });
}


// SIDEBAR NAVIGATION
navItems.forEach(button => {
    button.addEventListener("click", () => {
        showSection(button.dataset.section);
    });
});


// DASHBOARD NAVIGATION
document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showSection(button.dataset.go);
    });
});


// MOBILE MENU
if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
    });
}


// SEARCH AND FILTERS
if (searchInput) {
    searchInput.addEventListener("input", renderInventory);
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", renderInventory);
}

if (availabilityFilter) {
    availabilityFilter.addEventListener("change", renderInventory);
}


// BULK IMPORT OPEN
if (openBulkImportButton) {
    openBulkImportButton.addEventListener(
        "click",
        openBulkImportModal
    );
}


// BULK IMPORT CLOSE
document.querySelectorAll("[data-close-import]").forEach(button => {
    button.addEventListener("click", closeBulkImportModal);
});


// BULK FILE INPUT
if (bulkImportFile) {
    bulkImportFile.addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (file) {
            readBulkImportFile(file);
        }
    });
}


// BULK IMPORT CONFIRM
if (confirmBulkImportButton) {
    confirmBulkImportButton.addEventListener(
        "click",
        confirmBulkImport
    );
}


// UNDO LAST IMPORT
const undoLastImportButton = document.getElementById("undoLastImportButton");

if (undoLastImportButton) {
    undoLastImportButton.addEventListener("click", undoLastImport);
}


// ESCAPE KEY
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (dressModal?.classList.contains("active")) {
            closeDressModal();
        }

        if (bulkImportModal?.classList.contains("active")) {
            closeBulkImportModal();
        }
    }
});


// ==========================================
// HELPERS
// ==========================================

function getAvailabilityClass(status) {
    if (status === "Available") return "available";
    if (status === "Reserved") return "reserved";
    if (status === "Rented") return "rented";
    if (status === "Maintenance") return "maintenance";

    return "";
}


function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showError(message) {
    console.error(message);
    alert(message);
}

// ==========================================
// RESERVATIONS
// ==========================================

let reservations = [];
let activeReservationId = null;

async function loadReservations() {
    const tableBody = document.getElementById("reservationsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr><td colspan="7">Loading reservations...</td></tr>
    `;

    try {
        const response = await fetch(`${RESERVATIONS_URL}?key=${API_KEY}`);

        if (!response.ok) {
            throw new Error("Failed to load reservations.");
        }

        const data = await response.json();

        reservations = (data.documents || []).map(doc => {
            const fields = doc.fields || {};

            const getValue = (field) => {
                if (!fields[field]) return "";

                return fields[field].stringValue ??
                    fields[field].integerValue ??
                    fields[field].doubleValue ??
                    fields[field].booleanValue ??
                    fields[field].timestampValue ??
                    "";
            };

            return {
                id: doc.name.split("/").pop(),
                reservationId: getValue("reservationId"),
                customerName: getValue("customerName"),
                contact: getValue("contact"),
                customerEmail: getValue("customerEmail"),
                dressId: getValue("dressId"),
                dressName: getValue("dressName"),
                dressCode: getValue("dressCode"),
                dressSize: getValue("dressSize"),
                dressColor: getValue("dressColor"),
                reservationDate: getValue("reservationDate"),
                pickupDate: getValue("pickupDate"),
                returnDate: getValue("returnDate"),
                rentalPrice: getValue("rentalPrice"),
                deposit: getValue("deposit"),
                paymentStatus: getValue("paymentStatus"),
                status: getValue("status"),
                notes: getValue("notes")
            };
        });

        renderReservations();

    } catch (error) {
        console.error("Reservation loading error:", error);

        tableBody.innerHTML = `
            <tr><td colspan="7">Unable to load reservations.</td></tr>
        `;
    }
}



function renderReservations() {
    const tableBody = document.getElementById("reservationsTableBody");
    if (!tableBody) return;

    const search = document
        .getElementById("reservationSearch")
        ?.value.toLowerCase() || "";

    const statusFilter = document
        .getElementById("reservationStatusFilter")
        ?.value || "";

    const filtered = reservations.filter(reservation => {
        const matchesSearch =
            String(reservation.customerName).toLowerCase().includes(search) ||
            String(reservation.dressName).toLowerCase().includes(search) ||
            String(reservation.id).toLowerCase().includes(search);

        const matchesStatus =
            !statusFilter || reservation.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    updateReservationCounts();

    if (!filtered.length) {
        tableBody.innerHTML = `
            <tr><td colspan="7">No reservations found.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(reservation => `
        <tr
            class="clickable-reservation-row"
            data-reservation-id="${escapeHTML(reservation.id)}"
            tabindex="0"
            title="Click to view reservation details"
        >
            <td>${escapeHTML(reservation.id)}</td>
            <td>${escapeHTML(reservation.customerName)}</td>
            <td>${escapeHTML(reservation.dressName)}</td>
            <td>
                ${escapeHTML(reservation.pickupDate)}
                -
                ${escapeHTML(reservation.returnDate)}
            </td>
            <td>
                ₱${Number(reservation.rentalPrice || 0).toLocaleString()}
            </td>
            <td>${escapeHTML(reservation.status)}</td>
            <td>
                <button type="button" class="reservation-view-btn">
                    View
                </button>
            </td>
        </tr>
    `).join("");
}

// Make the entire reservation row clickable
const reservationsTableBody =
    document.getElementById("reservationsTableBody");

if (reservationsTableBody) {

    reservationsTableBody.addEventListener("click", function(event) {
        const row = event.target.closest(".clickable-reservation-row");

        if (!row) return;

        const reservationId = row.dataset.reservationId;

        if (reservationId) {
            viewReservation(reservationId);
        }
    });

    // Allow keyboard users to open a reservation with Enter or Space
    reservationsTableBody.addEventListener("keydown", function(event) {
        const row = event.target.closest(".clickable-reservation-row");

        if (!row) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            const reservationId = row.dataset.reservationId;

            if (reservationId) {
                viewReservation(reservationId);
            }
        }
    });
}



function updateReservationCounts() {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("reservationTotal", reservations.length);

    setText(
        "reservationPending",
        reservations.filter(r => r.status === "Pending").length
    );

    setText(
        "reservationConfirmed",
        reservations.filter(r => r.status === "Confirmed").length
    );

    setText(
        "reservationCompleted",
        reservations.filter(r => r.status === "Completed").length
    );
}


function viewReservation(id) {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    activeReservationId = id;

    const modal = document.getElementById("reservationDetailsModal");
    const content = document.getElementById("reservationDetailsContent");
    const reference = document.getElementById("reservationDetailsReference");

    if (!modal || !content) {
        alert("Reservation details modal was not found.");
        return;
    }

    if (reference) {
        reference.textContent = `Reference: ${reservation.reservationId || reservation.id}`;
    }

    content.innerHTML = `
        <div class="reservation-detail-grid">
            <div>
                <span>Customer</span>
                <strong>${escapeHTML(reservation.customerName || "—")}</strong>
            </div>

            <div>
                <span>Contact</span>
                <strong>${escapeHTML(reservation.contact || "—")}</strong>
            </div>

            <div>
                <span>Email</span>
                <strong>${escapeHTML(reservation.customerEmail || "—")}</strong>
            </div>

            <div>
                <span>Dress</span>
                <strong>${escapeHTML(reservation.dressName || "—")}</strong>
            </div>

            <div>
                <span>Pickup Date</span>
                <strong>${escapeHTML(reservation.pickupDate || "—")}</strong>
            </div>

            <div>
                <span>Return Date</span>
                <strong>${escapeHTML(reservation.returnDate || "—")}</strong>
            </div>

            <div>
                <span>Rental Price</span>
                <strong>₱${Number(reservation.rentalPrice || 0).toLocaleString()}</strong>
            </div>

            <div>
                <span>Payment Status</span>
                <strong>${escapeHTML(reservation.paymentStatus || "—")}</strong>
            </div>

            <div>
                <span>Reservation Status</span>
                <strong>${escapeHTML(reservation.status || "—")}</strong>
            </div>

            <div class="full">
                <span>Notes</span>
                <strong>${escapeHTML(reservation.notes || "None")}</strong>
            </div>
        </div>

        ${
            reservation.status === "Pending"
            ? `
                <div class="reservation-admin-actions">
                    <button
                        type="button"
                        class="primary-btn"
                        onclick="updateReservationStatus('${escapeHTML(reservation.id)}', 'confirm')">
                        Confirm Reservation
                    </button>

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="updateReservationStatus('${escapeHTML(reservation.id)}', 'reject')">
                        Reject Reservation
                    </button>
                </div>
            `
            : reservation.status === "Confirmed"
            ? `
                <div class="reservation-admin-actions">
                    <button
                        type="button"
                        class="primary-btn"
                        onclick="generateConfirmationCard('${escapeHTML(reservation.id)}')">
                        Generate Confirmation Card
                    </button>
                </div>

                <p class="reservation-status-note">
                    This reservation is confirmed.
                </p>
            `
            : `
                <p class="reservation-status-note">
                    This reservation is already ${escapeHTML(reservation.status)}.
                </p>
            `
        }
    `;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}

function generateConfirmationCard(id) {
    const reservation = reservations.find(r => r.id === id);

    if (!reservation || reservation.status !== "Confirmed") {
        alert("Only confirmed reservations can generate a confirmation card.");
        return;
    }

    const setCardText = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value || "—";
    };

    const money = value =>
        `₱${Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    setCardText("cardReference", reservation.reservationId || reservation.id);
    setCardText("cardCustomer", reservation.customerName);
    setCardText("cardContact", reservation.contact);
    setCardText("cardDress", reservation.dressName);
    setCardText(
        "cardSizeColor",
        [reservation.dressSize, reservation.dressColor]
            .filter(Boolean)
            .join(" / ") || "—"
    );
    setCardText("cardPickup", reservation.pickupDate);
    setCardText("cardReturn", reservation.returnDate);
    setCardText("cardPrice", money(reservation.rentalPrice));
    setCardText("cardDeposit", money(reservation.deposit));
    setCardText("cardPaymentStatus", reservation.paymentStatus || "Unpaid");

    const modal = document.getElementById("confirmationCardModal");

    if (modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeConfirmationCard() {
    const modal = document.getElementById("confirmationCardModal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}
function closeReservationDetails() {
    const modal = document.getElementById("reservationDetailsModal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    activeReservationId = null;
}


async function updateReservationStatus(id, action) {
    const reservation = reservations.find(r => r.id === id);

    if (!reservation) {
        alert("Reservation not found.");
        return;
    }

    if (reservation.status !== "Pending") {
        alert("Only pending reservations can be confirmed or rejected.");
        return;
    }

    if (action === "reject") {
        const proceed = confirm(
            "Are you sure you want to reject this reservation?"
        );

        if (!proceed) return;
    }

    if (action === "confirm") {
        const proceed = confirm(
            "Confirm this reservation? The selected dates will remain blocked."
        );

        if (!proceed) return;
    }

    try {
        const user = firebase.auth().currentUser;

        if (!user) {
            throw new Error("You are not signed in. Please log in again.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
            "/.netlify/functions/update-reservation",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    reservationId: id,
                    action: action
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to update reservation."
            );
        }

        alert(
            action === "confirm"
                ? "Reservation successfully confirmed."
                : "Reservation successfully rejected."
        );

        await loadReservations();

        if (action === "confirm") {
            const updatedReservation = reservations.find(r => r.id === id);

            if (updatedReservation) {
                viewReservation(id);
            } else {
                closeReservationDetails();
            }
        } else {
            closeReservationDetails();
        }

    } catch (error) {
        console.error("Reservation update error:", error);
        alert(error.message || "Something went wrong.");
    }
}


// Close reservation details modal
document.querySelectorAll("[data-close-reservation-details]")
    .forEach(button => {
        button.addEventListener("click", closeReservationDetails);
    });


// =========================================
// CONFIRMATION CARD BUTTONS
// =========================================

// Close confirmation card modal
document.querySelectorAll("[data-close-confirmation-card]")
    .forEach(button => {
        button.addEventListener("click", closeConfirmationCard);
    });

// Download confirmation card as PNG
const downloadConfirmationCardButton =
    document.getElementById("downloadConfirmationCard");

if (downloadConfirmationCardButton) {
    downloadConfirmationCardButton.addEventListener("click", async () => {
        const card = document.getElementById("confirmationCard");

        if (!card || typeof html2canvas !== "function") {
            alert("Image export is unavailable. Please refresh the page and try again.");
            return;
        }

        try {
            downloadConfirmationCardButton.disabled = true;
            downloadConfirmationCardButton.textContent = "Preparing Image...";

            const canvas = await html2canvas(card, {
                scale: 3,
                backgroundColor: "#fbf7f2",
                useCORS: true
            });

            const reference =
                document.getElementById("cardReference")?.textContent || "reservation";

            const safeReference = reference.replace(/[^a-z0-9-_]/gi, "-");

            const link = document.createElement("a");
            link.download = `Malea-Confirmation-${safeReference}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();

        } catch (error) {
            console.error("Confirmation card export error:", error);
            alert("Unable to create the image. Please try again.");

        } finally {
            downloadConfirmationCardButton.disabled = false;
            downloadConfirmationCardButton.textContent = "Download Image";
        }
    });
}

// Print confirmation card
const printConfirmationCardButton =
    document.getElementById("printConfirmationCard");

if (printConfirmationCardButton) {
    printConfirmationCardButton.addEventListener("click", () => {
        window.print();
    });
}

// Expose functions used by inline buttons
window.viewReservation = viewReservation;
window.updateReservationStatus = updateReservationStatus;
window.generateConfirmationCard = generateConfirmationCard;

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

window.editDress = editDress;
window.removeDress = removeDress;
window.closeDressModal = closeDressModal;
window.openAddDressModal = openAddDressModal;
window.showSection = showSection;


// ==========================================
// FIREBASE AUTHENTICATION
// ==========================================

const auth = firebase.auth();
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const appShell = document.querySelector(".app-shell");
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
        try {
            logoutButton.disabled = true;
            logoutButton.textContent = "Signing out...";

            await auth.signOut();

        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");

            logoutButton.disabled = false;
            logoutButton.textContent = "Log Out";
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        loginMessage.textContent = "";
        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";

        try {
            await auth.signInWithEmailAndPassword(
                loginEmail.value.trim(),
                loginPassword.value
            );
            loginPassword.value = "";
        } catch (error) {
            console.error("Login error:", error);
            const messages = {
                "auth/invalid-email": "Please enter a valid email address.",
                "auth/user-not-found": "No account was found with that email.",
                "auth/wrong-password": "Incorrect email or password.",
                "auth/invalid-credential": "Incorrect email or password.",
                "auth/too-many-requests": "Too many attempts. Please try again later.",
                "auth/network-request-failed": "Network error. Check your connection."
            };
            loginMessage.textContent = messages[error.code] || "Unable to sign in. Please try again.";
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
        }
    });
}

auth.onAuthStateChanged(function (user) {
    if (user) {
        loginScreen.style.display = "none";
        appShell.style.display = "";
        loadLastImportHistory();
        loadDresses();
    } else {
        appShell.style.display = "none";
        loginScreen.style.display = "flex";
        if (loginForm) loginForm.reset();
        if (loginMessage) loginMessage.textContent = "";
    }
});