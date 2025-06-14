// app.js (TU ARCHIVO DE LA APLICACIÓN WEB)

// Este objeto global será el puente para comunicarte con el código nativo de Android.
// Se inicializa como un objeto vacío si no estamos en el entorno Android (ej. en un navegador web),
// para evitar errores JavaScript cuando las funciones nativas no están disponibles.
window.AndroidBluetooth = window.AndroidBluetooth || {};

// =========================================================================
// 1. Funciones de Callback: Llamadas desde Android (nativas) a JavaScript (tu web app)
// =========================================================================
// Android usa estos métodos para notificar a tu aplicación web sobre eventos o resultados.
// TÚ DEBES IMPLEMENTAR LA LÓGICA DENTRO DE ESTAS FUNCIONES PARA ACTUALIZAR TU UI.

window.AndroidBluetooth.onBluetoothPermissionGranted = function() {
    console.log("Android: Permiso de Bluetooth concedido.");
    showToast("Permiso de Bluetooth concedido.", "success");
    // Lógica adicional si quieres que algo pase automáticamente al conceder permisos
    // Por ejemplo: startAndroidBluetoothScan();
};

window.AndroidBluetooth.onBluetoothPermissionDenied = function(message) {
    console.error("Android: Permiso de Bluetooth denegado:", message);
    showToast("Permiso de Bluetooth denegado: " + message, "error");
};

window.AndroidBluetooth.onBluetoothEnabled = function() {
    console.log("Android: Bluetooth está activado.");
    showToast("Bluetooth activado.", "success");
    // Lógica adicional si quieres que algo pase automáticamente al activar Bluetooth
    // Por ejemplo: startAndroidBluetoothScan();
};

window.AndroidBluetooth.onBluetoothError = function(message) {
    console.error("Android: Error de Bluetooth:", message);
    showToast("Error de Bluetooth: " + message, "error");
};

window.AndroidBluetooth.onBluetoothScanStarted = function() {
    console.log("Android: Escaneo de dispositivos Bluetooth iniciado.");
    showToast("Buscando impresoras Bluetooth...", "info");
    // --- LÓGICA DE UI AQUI: Actualiza tu interfaz para indicar que el escaneo está en curso ---
    // Por ejemplo:
    if (typeof availableBluetoothDevices !== 'undefined') {
        availableBluetoothDevices = {}; // Limpiar la lista de dispositivos encontrados
    }
    if (typeof renderBluetoothDevices === 'function') {
        renderBluetoothDevices([]); // Limpiar la UI de la lista visible
    }
    // Ocultar botón "Buscar" y mostrar "Cancelar Escaneo"
    if(document.getElementById('scan-bt-devices-button')) document.getElementById('scan-bt-devices-button').classList.add('hidden');
    if(document.getElementById('cancel-scan-button')) document.getElementById('cancel-scan-button').classList.remove('hidden');
};

window.AndroidBluetooth.onBluetoothDeviceFound = function(deviceName, deviceAddress) {
    console.log(`Android: Dispositivo encontrado: ${deviceName} (${deviceAddress})`);
    // --- LÓGICA DE UI AQUI: Añade el dispositivo a tu lista en la interfaz de usuario ---
    if (typeof availableBluetoothDevices === 'object' && !availableBluetoothDevices[deviceAddress]) {
        availableBluetoothDevices[deviceAddress] = deviceName;
        // Re-renderizar la lista completa o añadir el item individualmente
        if (typeof renderBluetoothDevices === 'function') {
            renderBluetoothDevices(Object.keys(availableBluetoothDevices).map(addr => ({name: availableBluetoothDevices[addr], address: addr})));
        }
    }
};

window.AndroidBluetooth.onBluetoothScanFinished = function() {
    console.log("Android: Escaneo de dispositivos Bluetooth finalizado.");
    showToast("Escaneo finalizado.", "info");
    // --- LÓGICA DE UI AQUI: Actualiza tu interfaz para indicar que el escaneo terminó ---
    // Por ejemplo:
    if(document.getElementById('scan-bt-devices-button')) document.getElementById('scan-bt-devices-button').classList.remove('hidden');
    if(document.getElementById('cancel-scan-button')) document.getElementById('cancel-scan-button').classList.add('hidden');
    if (typeof availableBluetoothDevices === 'object' && Object.keys(availableBluetoothDevices).length === 0) {
        if(document.getElementById('bluetooth-device-list')) document.getElementById('bluetooth-device-list').innerHTML = '<li>No se encontraron dispositivos.</li>';
    }
};

window.AndroidBluetooth.onBluetoothConnected = function(deviceAddress) {
    console.log("Android: Conectado a dispositivo con dirección:", deviceAddress);
    showToast("Conectado a la impresora.", "success");
    // --- LÓGICA DE UI AQUI: Actualiza tu interfaz para mostrar que estás conectado ---
    // Por ejemplo:
    const deviceName = (typeof availableBluetoothDevices === 'object' && availableBluetoothDevices[deviceAddress]) ? availableBluetoothDevices[deviceAddress] : deviceAddress;
    if(document.getElementById('connected-bt-device-name')) document.getElementById('connected-bt-device-name').textContent = 'Ninguno'; // Should display connected device name
    updateBluetoothUIState(); // Llama a una función para actualizar el estado general de los botones BT
};

window.AndroidBluetooth.onBluetoothDisconnected = function() {
    console.log("Android: Dispositivo Bluetooth desconectado.");
    showToast("Impresora desconectada.", "info");
    // --- LÓGICA DE UI AQUI: Actualiza tu interfaz para mostrar que no hay conexión ---
    // Por ejemplo:
    if(document.getElementById('connected-bt-device-name')) document.getElementById('connected-bt-device-name').textContent = 'Ninguno';
    updateBluetoothUIState(); // Llama a una función para actualizar el estado general de los botones BT
};

window.AndroidBluetooth.onBluetoothPrintSuccess = function() {
    console.log("Android: Impresión enviada exitosamente.");
    showToast("Impresión enviada correctamente.", "success");
};

// =========================================================================
// 2. Funciones de Interfaz: Llamadas desde JavaScript (tu web app) a Android (nativas)
// =========================================================================
// TÚ LLAMAS A ESTAS FUNCIONES DESDE TU CÓDIGO JavaScript (ej., al hacer clic en un botón).
// Comprueba siempre `typeof AndroidBluetooth.funcionX !== 'undefined'` para asegurarte
// de que la app está corriendo en Android y el puente está disponible.

/**
 * Solicita los permisos necesarios de Bluetooth y ubicación al sistema Android.
 * La respuesta se maneja a través de los callbacks onBluetoothPermissionGranted/Denied.
 */
function requestAndroidBluetoothPermissions() {
    if (typeof AndroidBluetooth.requestBluetoothPermission !== 'undefined') {
        AndroidBluetooth.requestBluetoothPermission();
    } else {
        console.warn("AndroidBluetooth.requestBluetoothPermission no está disponible.");
        showToast("Las funciones Bluetooth no están disponibles en este entorno (solo en Android).", "warning");
    }
}

/**
 * Inicia el escaneo de dispositivos Bluetooth cercanos.
 * Los dispositivos encontrados se reportan vía onBluetoothDeviceFound.
 * El fin del escaneo se reporta vía onBluetoothScanFinished.
 */
function startAndroidBluetoothScan() {
    if (typeof AndroidBluetooth.scanBluetoothDevices !== 'undefined') {
        AndroidBluetooth.scanBluetoothDevices();
    } else {
        console.warn("AndroidBluetooth.scanBluetoothDevices no está disponible.");
        showToast("Las funciones de escaneo Bluetooth no están disponibles en este entorno (solo en Android).", "warning");
    }
}

/**
 * Cancela cualquier escaneo de Bluetooth en curso.
 */
function cancelAndroidBluetoothScan() {
    if (typeof AndroidBluetooth.cancelBluetoothScan !== 'undefined') {
        AndroidBluetooth.cancelBluetoothScan();
    } else {
        console.warn("AndroidBluetooth.cancelBluetoothScan no está disponible.");
    }
}

/**
 * Intenta conectar a un dispositivo Bluetooth específico por su dirección MAC.
 * @param {string} deviceAddress La dirección MAC del dispositivo Bluetooth (ej. "00:11:22:AA:BB:CC").
 */
function connectAndroidBluetoothDevice(deviceAddress) {
    if (typeof AndroidBluetooth.connectBluetoothDevice !== 'undefined') {
        AndroidBluetooth.connectBluetoothDevice(deviceAddress);
    } else {
        console.warn("AndroidBluetooth.connectBluetoothDevice no está disponible.");
        showToast("Las funciones de conexión Bluetooth no están disponibles en este entorno (solo en Android).", "warning");
    }
}

/**
 * Envía datos (comandos ESC/POS, texto, etc.) a la impresora térmica conectada.
 * Los datos DEBEN ser una cadena codificada en Base64.
 * Esto es crucial para manejar correctamente los bytes binarios de los comandos de impresión.
 * @param {string} base64Data Los datos a imprimir, codificados en Base64.
 */
function sendAndroidPrintData(base64Data) {
    if (typeof AndroidBluetooth.printThermalData !== 'undefined') {
        AndroidBluetooth.printThermalData(base64Data);
    } else {
        console.warn("AndroidBluetooth.printThermalData no está disponible.");
        showToast("Las funciones de impresión Bluetooth no están disponibles en este entorno (solo en Android).", "warning");
    }
}

/**
 * Desconecta del dispositivo Bluetooth actualmente conectado.
 */
function disconnectAndroidBluetoothDevice() {
    if (typeof AndroidBluetooth.disconnectBluetoothDevice !== 'undefined') {
        AndroidBluetooth.disconnectBluetoothDevice();
    } else {
        console.warn("AndroidBluetooth.disconnectBluetoothDevice no está disponible.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // --- Constantes de Configuración ---
    const ADMIN_CODE = "123456"; // Código de administrador para acciones sensibles
    const LOW_STOCK_THRESHOLD = 5; // Umbral para marcar productos con bajo stock
    const SPLASH_DURATION = 1000; // Duración de la pantalla de splash en milisegundos
    const HOT_DOG_PRODUCT_NAMES_FOR_PROMO = ["hot dog", "hotdog", "hotdog especial", "hotdogs"]; // For 2x1 promo
    const HOT_DOG_PROMO_PRICE_PER_PAIR = 150; // Precio fijo por cada par de Hot Dogs en la promoción
    const BUSINESS_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/la-hotdogeria.firebasestorage.app/o/logo.png.png?alt=media&token=57d67059-40f0-4a9b-a437-3fc36eef8afc"; // URL del logo para la impresión y fondo
    const BUSINESS_DAY_START_HOUR = 14; // 2 PM (14:00) - Start of the business day for reporting (e.g., a shift from 2 PM to 2 AM next day belongs to the 2 PM's date)

    // List of words to identify hotdog products for commission
    const HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION = ["hot dog", "hotdog", "perro caliente"];


    // ===============================================================
    // === TU CONFIGURACIÓN REAL DE FIREBASE ===
    // Asegúrate de que estos datos coincidan con los de tu proyecto en la consola de Firebase
    // NO COMPARTAS TU API KEY EN REPOSITORIOS PÚBLICOS SIN REGLAS DE SEGURIDAD ADECUADAS
    // ===============================================================
    const firebaseConfig = {
        apiKey: "AIzaSyBo1RT0XiSDoyiLrA_u17NOTl3bcWrR-Cs",
        authDomain: "la-hotdogeria.firebaseapp.com",
        projectId: "la-hotdogeria",
        storageBucket: "la-hotdogeria.firebasestorage.app",
        messagingSenderId: "465067721595",
        appId: "1:465067721595:web:686b61dd83badc8d29b3de"
    };
    // ===============================================================

    // --- Inicialización de Firebase ---
    let db;
    let auth;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase inicializado.");
        } else {
            console.log("Firebase ya inicializado.");
        }

        if (firebase.firestore) {
            db = firebase.firestore();
            console.log("Firebase Firestore instance obtained.");
        } else {
            console.error("Firestore SDK not loaded.");
            db = null;
        }

        if (firebase.auth) {
            auth = firebase.auth();
            console.log("Firebase Auth instance obtained.");
        } else {
            console.error("Auth SDK not loaded.");
            auth = null;
        }

        if (db) {
            // COMENTADO PARA FORZAR EL LOGIN EN CADA APERTURA POR SEGURIDAD
            // db.enablePersistence({
            //     synchronizeTabs: true
            // }).catch((err) => {
            //     if (err.code == "failed-precondition") {
            //         console.warn(
            //             "Persistencia offline no habilitada: múltiples pestañas abiertas."
            //         );
            //     } else if (err.code == "unimplemented") {
            //         console.warn("Persistencia offline no soportada por este navegador.");
            //     } else {
            //         console.error("Error habilitando persistencia offline:", err);
            //     }
            // });
            console.log("Firestore persistence NOT enabled (forced logout on close).");
        }
    } catch (error) {
        console.error(
            "Error crítico: No se pudo inicializar Firebase. Revisa tu configuración.",
            error
        );
        alert(
            "Error crítico: No se pudo conectar a Firebase. La aplicación podría no funcionar correctamente. Revisa tu conexión y la configuración de Firebase."
        );
        db = null;
        auth = null;
    }


    // --- Estado de la Aplicación ---
    let currentUser = null;
    let productsCache = []; // Stores product details including costPrice
    let cart = [];
    let cartDiscountType = 'none';
    let cartDiscountValue = 0;
    let cartDiscountAmount = 0;
    let editingProductId = null;
    let editingUserId = null;
    let editingCartItemId = null;
    let adminActionCallback = null;
    let confirmActionCallback = null;
    let currentReportData = null;
    let currentInvoiceId = null;
    let currentShiftTeamMembers = []; // Stores names of employees working under a shared account (set via modal)
    let currentShiftName = ''; // Stores the name of the current shift (set via modal)

    // --- Utility Functions ---

    const showScreen = (screenElement) => {
        if (!screenElement || !screenElement.classList) {
            console.error("Attempted to show an invalid screen element.");
            return;
        }
        Object.values(screens).forEach((s) => {
            if (s && s.classList) s.classList.remove("active");
        });
        screenElement.classList.add("active");
        hideAllModals();

        if (mainAppUI.appBackground) {
            if (screenElement === screens.mainApp) {
                mainAppUI.appBackground.style.display = 'block';
            } else {
                mainAppUI.appBackground.style.display = 'none';
            }
        }
    };

    const formatPrice = (price) => `RD$${Number(price).toFixed(2)}`;

    const updateDateTime = () => {
        const now = new Date();
        const options = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        };
        if (mainAppUI.dateTimeDisplay) {
            mainAppUI.dateTimeDisplay.textContent = now.toLocaleDateString(
                "es-DO",
                options
            );
        }
    };

    const showToast = (message, type = "info", duration = 3000) => {
        const toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            console.error("Toast container not found.");
            alert(message); // Fallback a alert si el contenedor no existe
            return;
        }

        const toast = document.createElement("div");
        toast.classList.add("toast", type);

        let iconClass = '';
        switch (type) {
            case 'success':
                iconClass = 'fas fa-check-circle';
                break;
            case 'error':
                iconClass = 'fas fa-times-circle';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-triangle';
                break;
            case 'info':
            default:
                iconClass = 'fas fa-info-circle';
                break;
        }

        toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Forzar reflow para la transición
        void toast.offsetWidth;

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => toast.remove());
        }, duration);
    };

    const showAlert = (message, type = "info") => {
        console.log(`ALERT (Redirected to Toast): ${message}`);
        showToast(message, type);
    };

    const showAdminActionMessage = (message) => {
        const modal = modals.adminCode;
        if (!modal?.element || !modal.message) {
            console.error("Admin code modal elements not found for message.");
            return;
        }

        modal.message.textContent = message;
        modal.input?.classList.add("hidden");
        modal.verifyButton?.classList.add("hidden");

        modal.element.classList.remove("hidden");

        // REMOVED: No auto-closing, modal is now sticky
        // setTimeout(() => {
        //     hideAllModals();
        // }, 3000);
    };

    /**
     * Calculates the start and end timestamps for a business day, considering a night shift.
     * A business day starting on `dateStr` actually begins at `BUSINESS_DAY_START_HOUR` on that day
     * and ends at `BUSINESS_DAY_START_HOUR - 1` on the next calendar day.
     * For example, if BUSINESS_DAY_START_HOUR is 14 (2 PM):
     * A business day for '2023-10-26' would be from 2023-10-26 14:00:00 to 2023-10-27 13:59:59.
     *
     * @param {string} startDateStr - The date string (YYYY-MM-DD) for the start of the business day.
     * @param {string} endDateStr - The date string (YYYY-MM-DD) for the end of the business day.
     * @returns {{start: firebase.firestore.Timestamp, end: firebase.firestore.Timestamp}}
     */
    const getBusinessDateRange = (startDateStr, endDateStr) => {
        const startCalendarDate = new Date(startDateStr);
        const endCalendarDate = new Date(endDateStr);

        // For the start of the range:
        // It's BUSINESS_DAY_START_HOUR of the startCalendarDate
        const startBusinessDateTime = new Date(startCalendarDate);
        startBusinessDateTime.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);

        // For the end of the range:
        // It's (BUSINESS_DAY_START_HOUR - 1) of the day AFTER endCalendarDate.
        const endBusinessDateTime = new Date(endCalendarDate);
        endBusinessDateTime.setDate(endBusinessDateTime.getDate() + 1); // Move to the next calendar day
        endBusinessDateTime.setHours(BUSINESS_DAY_START_HOUR - 1, 59, 59, 999); // Set to 1 hour before start of next business day

        console.log("Calculated business date range:");
        console.log("Start (Local):", startBusinessDateTime.toLocaleString());
        console.log("End (Local):", endBusinessDateTime.toLocaleString());

        return {
            start: firebase.firestore.Timestamp.fromDate(startBusinessDateTime),
            end: firebase.firestore.Timestamp.fromDate(endBusinessDateTime)
        };
    };

    // --- Modal Functions ---
    const hideAllModals = () => {
        Object.values(modals).forEach((m) => {
            if (m && m.element && !m.element.classList.contains("hidden")) {
                m.element.classList.add("hidden");
            }
        });
        adminActionCallback = null;
        confirmActionCallback = null;
        editingProductId = null;
        editingUserId = null;
        editingCartItemId = null;
        currentInvoiceId = null;

        if (modals.adminCode?.element) {
            if (modals.adminCode.input) {
                modals.adminCode.input.value = "";
                modals.adminCode.input.classList.remove("hidden");
            }
            if (modals.adminCode.verifyButton)
                modals.adminCode.verifyButton.classList.remove("hidden");
            if (modals.adminCode.message)
                modals.adminCode.message.textContent =
                "Ingrese el código para continuar.";
        }

        if (modals.product?.element) {
            if (modals.product.nameInput) modals.product.nameInput.value = "";
            if (modals.product.codeInput) modals.product.codeInput.value = "";
            if (modals.product.priceInput) modals.product.priceInput.value = "";
            if (modals.product.costInput) modals.product.costInput.value = ""; // NEW: Clear cost input
            if (modals.product.stockInput) modals.product.stockInput.value = "";
            if (modals.product.categoryInput) modals.product.categoryInput.value = "";
            
            // Re-enable inputs/buttons after hiding, for next time it's opened (especially if opened by admin)
            if (modals.product.nameInput) modals.product.nameInput.disabled = false;
            if (modals.product.codeInput) modals.product.codeInput.disabled = false;
            if (modals.product.priceInput) modals.product.priceInput.disabled = false;
            if (modals.product.costInput) modals.product.costInput.disabled = false;
            if (modals.product.stockInput) modals.product.stockInput.disabled = false;
            if (modals.product.categoryInput) modals.product.categoryInput.disabled = false;
            if (modals.product.saveButton) modals.product.saveButton.disabled = false;
        }
        if (modals.user?.element) {
            if (modals.user.nameInput) modals.user.nameInput.value = "";
            if (modals.user.usernameInput) modals.user.usernameInput.value = "";
            if (modals.user.emailInput) modals.user.emailInput.value = ""; // NEW: Clear email input
            if (modals.user.idInput) modals.user.idInput.value = "";
            if (modals.user.passwordInput) modals.user.passwordInput.value = "";
            if (modals.user.roleSelect) modals.user.roleSelect.value = "colaborator";
            if (modals.user.generalCommissionEnabledCheckbox)
                modals.user.generalCommissionEnabledCheckbox.checked = false;
            if (modals.user.generalCommissionAmountInput)
                modals.user.generalCommissionAmountInput.value = "";
            if (modals.user.generalCommissionAmountGroup?.closest(".form-group")) // Renamed ID
                modals.user.generalCommissionAmountGroup // Renamed ID
                .classList.add("hidden");
            if (modals.user.hotdogCommissionEnabledCheckbox) // NEW
                modals.user.hotdogCommissionEnabledCheckbox.checked = false;
            if (modals.user.hotdogCommissionPerItemInput) // NEW
                modals.user.hotdogCommissionPerItemInput.value = "";
            if (modals.user.hotdogCommissionAmountGroup) // NEW
                modals.user.hotdogCommissionAmountGroup.classList.add("hidden");
            if (modals.user.isTeamAccountCheckbox) // NEW
                modals.user.isTeamAccountCheckbox.checked = false;

            if (modals.user.idInput) modals.user.idInput.disabled = false;
            if (modals.user.emailInput) modals.user.emailInput.disabled = false; // NEW: Re-enable email input
            if (modals.user.usernameInput) modals.user.usernameInput.disabled = false;
            if (modals.user.saveButton) modals.user.saveButton.disabled = false;
        }
        if (modals.editCartItem?.element) {
            if (modals.editCartItem.quantityInput)
                modals.editCartItem.quantityInput.value = "";
            if (modals.editCartItem.priceInput)
                modals.editCartItem.priceInput.value = "";
            if (modals.editCartItem.nameDisplay)
                modals.editCartItem.nameDisplay.textContent = "";
            if (modals.editCartItem.stockInfo)
                modals.editCartItem.stockInfo.textContent = "Stock disponible: ---";
            if (modals.editCartItem.saveButton)
                modals.editCartItem.saveButton.disabled = false;
        }

        if (modals.invoicePreview?.element) {
            if (modals.invoicePreview.content)
                modals.invoicePreview.content.innerHTML = "";
            if (modals.invoicePreview.printButton)
                modals.invoicePreview.printButton.disabled = false;
            if (modals.invoicePreview.deleteButton)
                modals.invoicePreview.deleteButton.disabled = false;
            if (modals.invoicePreview.modifyButton) // NEW: Modify button for invoice
                modals.invoicePreview.modifyButton.disabled = false; // NEW
        }
        if (modals.inventoryMovement?.element) {
            if (modals.inventoryMovement.productSelect) modals.inventoryMovement.productSelect.value = '';
            if (modals.inventoryMovement.typeSelect) modals.inventoryMovement.typeSelect.value = 'in';
            if (modals.inventoryMovement.quantityInput) modals.inventoryMovement.quantityInput.value = '';
            if (modals.inventoryMovement.descriptionInput) modals.inventoryMovement.descriptionInput.value = '';
            if (modals.inventoryMovement.saveButton) modals.inventoryMovement.saveButton.disabled = false;
            if (modals.inventoryMovement.saveButton) modals.inventoryMovement.saveButton.textContent = 'Registrar Movimiento';
        }
        if (modals.setTeamMembers?.element) { // NEW
            if (modals.setTeamMembers.shiftNameInput) modals.setTeamMembers.shiftNameInput.value = '';
            if (modals.setTeamMembers.teamMembersList) modals.setTeamMembers.teamMembersList.innerHTML = '';
            if (modals.setTeamMembers.printButton) modals.setTeamMembers.printButton.disabled = false; // NEW
            modals.setTeamMembers.saveButton.disabled = false;
            modals.setTeamMembers.saveButton.textContent = 'Guardar';
            // Do NOT clear currentShiftTeamMembers/currentShiftName here,
            // as they store the active shift members.
            // They should only be cleared on logout or manual reset.
        }
    };

    const showModal = (modalObj, ...args) => {
        if (!modalObj || !modalObj.element || !modalObj.element.classList) {
            console.error(
                "Attempted to show a non-existent or invalid modal object, or its element property is missing."
            );
            return;
        }

        hideAllModals();

        if (modalObj === modals.adminCode && args.length >= 2) {
            if (modalObj.message)
                modalObj.message.textContent = `Ingrese el código para ${args[0]}`;
            adminActionCallback = args[1];
            if (modalObj.input) {
                modalObj.input.value = "";
                modalObj.input.classList.remove("hidden");
                setTimeout(() => modalObj.input.focus(), 100);
            }
            if (modalObj.verifyButton)
                modalObj.verifyButton.classList.remove("hidden");
        } else if (modalObj === modals.confirmAction && args.length >= 3) {
            if (modalObj.title) modalObj.title.textContent = args[0];
            if (modalObj.message) modalObj.message.textContent = args[1];
            confirmActionCallback = args[2];
        } else if (modalObj === modals.product) {
            const mode = args[0];
            const product = args[1];

            editingProductId = mode === 'edit' ? product?.id || null : null;
            modalObj.title.textContent = mode === 'edit' ? 'Editar Producto' : 'Añadir Producto';
            modalObj.saveButton.textContent = mode === 'edit' ? 'Actualizar' : 'Guardar';

            modalObj.nameInput.value = product?.name || '';
            modalObj.codeInput.value = product?.code || '';
            modalObj.priceInput.value = product?.price || '';
            modalObj.costInput.value = product?.costPrice || ''; // NEW: populate cost input
            modalObj.stockInput.value = product?.stock || '';
            modalObj.categoryInput.value = product?.category || '';

            // Only admins can add/edit product data
            const isAdmin = currentUser && currentUser.role === "admin";
            modalObj.nameInput.disabled = !isAdmin && mode === 'edit'; // Name can be edited by admin if in edit mode
            modalObj.codeInput.disabled = !isAdmin || mode === 'edit'; // Code can be set by admin when adding, but disabled when editing
            modalObj.priceInput.disabled = !isAdmin;
            modalObj.costInput.disabled = !isAdmin;
            modalObj.stockInput.disabled = !isAdmin;
            modalObj.categoryInput.disabled = !isAdmin;
            modalObj.saveButton.disabled = !isAdmin;

            if (isAdmin) {
                setTimeout(() => modalObj.nameInput.focus(), 100);
            }

        } else if (modalObj === modals.user) {
            const mode = args[0];
            const user = args[1];

            editingUserId = mode === 'edit' ? user?.uid || null : null;
            modalObj.title.textContent = mode === 'edit' ? 'Editar Usuario' : 'Añadir Metadatos de Usuario';
            modalObj.saveButton.textContent = mode === 'edit' ? 'Actualizar' : 'Guardar';

            modalObj.nameInput.value = user?.name || '';
            modalObj.usernameInput.value = user?.username || '';
            modalObj.emailInput.value = user?.email || ''; // NEW: Populate email input
            modalObj.idInput.value = user?.uid || '';
            modalObj.passwordInput.value = '';
            modalObj.roleSelect.value = user?.role || 'colaborator';

            modalObj.generalCommissionEnabledCheckbox.checked = user?.generalCommissionEnabled || false; // Renamed ID
            modalObj.generalCommissionAmountInput.value = user?.generalCommissionAmount || ''; // Renamed ID
            modalObj.generalCommissionAmountGroup.classList.toggle('hidden', !modalObj.generalCommissionEnabledCheckbox.checked); // Renamed ID
            modalObj.generalCommissionEnabledCheckbox.onchange = () => { // Renamed ID
                modalObj.generalCommissionAmountGroup.classList.toggle('hidden', !modalObj.generalCommissionEnabledCheckbox.checked); // Renamed ID
                if (modalObj.generalCommissionEnabledCheckbox.checked) { // Renamed ID
                    modalObj.generalCommissionAmountInput.focus(); // Renamed ID
                }
            };

            modalObj.hotdogCommissionEnabledCheckbox.checked = user?.hotdogCommissionEnabled || false; // NEW
            modalObj.hotdogCommissionPerItemInput.value = user?.hotdogCommissionPerItem || ''; // NEW
            modalObj.hotdogCommissionAmountGroup.classList.toggle('hidden', !modalObj.hotdogCommissionEnabledCheckbox.checked); // NEW
            modalObj.hotdogCommissionEnabledCheckbox.onchange = () => { // NEW
                modalObj.hotdogCommissionAmountGroup.classList.toggle('hidden', !modalObj.hotdogCommissionEnabledCheckbox.checked); // NEW
                if (modalObj.hotdogCommissionEnabledCheckbox.checked) { // NEW
                    modalObj.hotdogCommissionPerItemInput.focus(); // NEW
                }
            };
            modalObj.isTeamAccountCheckbox.checked = user?.isTeamAccount || false; // NEW

            modalObj.idInput.disabled = mode === 'edit';
            // START MODIFICACIÓN: Permitir la edición del email en los metadatos de Firestore
            // IMPORTANTE: Esto solo actualiza el email en el documento de metadatos del usuario en Firestore.
            // NO actualiza el email real de la cuenta de autenticación de Firebase (el email de login).
            // Cambiar el email de autenticación de Firebase requiere llamadas a la API específicas (ej. auth.currentUser.updateEmail()
            // para el usuario logueado, o funciones de Firebase Admin SDK para otros usuarios a través de un backend).
            modalObj.emailInput.disabled = false; // Permitir edición
            // FIN MODIFICACIÓN
            modalObj.usernameInput.disabled = false;
            modalObj.saveButton.disabled = false;
            setTimeout(() => modalObj.nameInput.focus(), 100);

        } else if (modalObj === modals.invoicePreview && args.length >= 2) {
            // Args[0] is the invoice HTML, Args[1] is the invoice ID
            const invoiceHtml = args[0];
            currentInvoiceId = args[1];

            if (modalObj.content) modalObj.content.innerHTML = invoiceHtml;

            const isAdmin = currentUser && currentUser.role === "admin";
            // Delete button is ALWAYS admin-only
            modalObj.deleteButton?.classList.toggle("hidden", !isAdmin);
            // Modify button is visible for both roles, but requires admin code for collaborators
            modalObj.modifyButton?.classList.remove("hidden");
            if (!currentInvoiceId) { // If no invoice ID, cannot modify
                modalObj.modifyButton?.classList.add("hidden");
            }
        } else if (modalObj === modals.invoicePreview && args.length >= 1) {
            // Args[0] is the invoice HTML, no ID passed (e.g. for temporary print preview)
            if (modalObj.content) modalObj.content.innerHTML = args[0];
            currentInvoiceId = null; // No specific invoice ID
            console.warn("Invoice modal shown without invoice ID.");
            modalObj.deleteButton?.classList.add("hidden");
            modalObj.modifyButton?.classList.add("hidden");
        } else if (modalObj === modals.editCartItem && args.length >= 1) {
            const cartItem = args[0];
            editingCartItemId = cartItem?.id || null;
            if (!editingCartItemId) {
                console.error(
                    "Attempted to open edit cart item modal without a valid item:",
                    cartItem
                );
                showAlert("Error interno: Información del item incompleta.", "error");
                return;
            }

            const productInCache = productsCache.find(
                (p) => p.id === editingCartItemId
            );
            const availableStock = productInCache?.stock ?? 0;

            if (modalObj.nameDisplay)
                modalObj.nameDisplay.textContent = cartItem?.name || "Item";
            if (modalObj.quantityInput) {
                modalObj.quantityInput.value = cartItem?.quantity ?? 1;
                modalObj.quantityInput.setAttribute("min", 1);
                if (typeof availableStock === "number" && availableStock >= 0) {
                    modalObj.quantityInput.setAttribute("max", availableStock);
                } else {
                    modalObj.quantityInput.removeAttribute("max");
                }
            }
            if (modalObj.priceInput) modalObj.priceInput.value = cartItem?.price ?? 0;
            if (modalObj.stockInfo)
                modalObj.stockInfo.textContent = `Stock disponible: ${
          typeof availableStock === "number" ? availableStock : "N/A"
        }`;

            if (modalObj.saveButton)
                modalObj.saveButton.disabled = false;

            if (modalObj.quantityInput)
                setTimeout(() => modalObj.quantityInput.focus(), 100);
        } else if (modalObj === modals.inventoryMovement) {
            if (modals.inventoryMovement.productSelect) {
                setTimeout(() => modals.inventoryMovement.productSelect.focus(), 100);
            }
        } else if (modalObj === modals.setTeamMembers) { // NEW
            if (modals.setTeamMembers.shiftNameInput) {
                modals.setTeamMembers.shiftNameInput.value = currentShiftName;
            }
            if (modals.setTeamMembers.teamMembersList) {
                modals.setTeamMembers.teamMembersList.innerHTML = '<p class="placeholder-text">Cargando usuarios...</p>';
                loadUsersForTeamSelection();
            }
            if (modals.setTeamMembers.printButton) modals.setTeamMembers.printButton.disabled = false; // NEW
            modals.setTeamMembers.saveButton.disabled = false;
            modals.setTeamMembers.saveButton.textContent = 'Guardar';
        }

        modalObj.element.classList.remove("hidden");
    };
    // --- End Modal Functions ---

    // --- DOM Selectors ---
    const screens = {
        splash: document.getElementById("splash-screen"),
        login: document.getElementById("login-screen"),
        recoverPassword: document.getElementById("recover-password-screen"),
        mainApp: document.getElementById("main-app"),
    };

    const loginForm = {
        usernameInput: document.getElementById("login-user"),
        password: document.getElementById("login-password"),
        loginButton: document.getElementById("login-button"),
        forgotPasswordLink: document.getElementById("forgot-password-link")
    };

    const passwordToggle = document.getElementById("password-toggle");
    const loginPasswordInput = document.getElementById("login-password");

    const recoverForm = {
        adminCodeInput: document.getElementById("admin-code-input"),
        verifyAdminCodeButton: document.getElementById("verify-admin-code-button"),
        newPasswordForm: document.getElementById("new-password-form"),
        newPasswordInput: document.getElementById("new-password-input"),
        confirmNewPasswordInput: document.getElementById(
            "confirm-new-password-input"
        ),
        resetPasswordButton: document.getElementById("reset-password-button"),
        backToLoginLink: document.getElementById("back-to-login-link"),

        resetEmailInput: document.createElement("input"),
        sendResetEmailButton: document.createElement("button")
    };
    recoverForm.resetEmailInput.type = "email";
    recoverForm.resetEmailInput.id = "reset-email-input";
    recoverForm.resetEmailInput.placeholder = "Ingresa tu email registrado";
    recoverForm.sendResetEmailButton.id = "send-reset-email-button";
    recoverForm.sendResetEmailButton.classList.add("button-primary");
    recoverForm.sendResetEmailButton.textContent = "Enviar email de recuperación";

    const mainAppUI = {
        appBackground: document.getElementById("app-background"),
        currentUserDisplay: {
            name: document.getElementById("current-user-name"),
            id: document.getElementById("current-user-id")
        },
        dateTimeDisplay: document.getElementById("current-datetime"),
        themeToggleButton: document.getElementById("theme-toggle-button"),
        logoutButton: document.getElementById("logout-button"),
        navLinks: document.querySelectorAll(".nav-list a"),
        discountNavLink: document.getElementById('apply-discount-nav-link'),
        contentSections: document.querySelectorAll(".content-section"),
        adminOnlyElements: document.querySelectorAll(".admin-only"),
        lowStockCountBadge: document.getElementById('low-stock-count'),
        setTeamMembersButton: document.getElementById('set-team-members-button'), // NEW
    };

    const ventasUI = {
        productSearchInput: document.getElementById("product-search-input"),
        productsGrid: document.getElementById("products-grid"),
        categorySelect: document.getElementById('category-select'),
        applyPromoSection: document.getElementById('apply-promo-section'),
        discountTypeSelect: document.getElementById('discount-type-select'),
        discountValueInput: document.getElementById('discount-value-input'),
        discountValueGroup: document.getElementById('discount-value-group'),
        applyManualDiscountButton: document.getElementById('apply-manual-discount-button'),
    };

    const cartUI = {
        sidebar: document.querySelector(".cart-sidebar"),
        appliedDiscountDisplay: document.getElementById("applied-discount-display"),
        clearDiscountButton: document.getElementById("clear-discount-button"),
        itemsList: document.getElementById("cart-items-list"),
        placeholder: document.querySelector(".cart-placeholder"),
        subtotalAmountDisplay: document.getElementById("cart-subtotal-amount"),
        discountAmountSummary: document.getElementById("cart-discount-summary"),
        discountAmountDisplay: document.getElementById("cart-discount-amount"),
        totalAmountSummary: document.getElementById("cart-total-summary"),
        totalAmountDisplay: document.getElementById("cart-total-amount"),
        paymentMethodSection: document.getElementById("payment-method-section"),
        paymentMethodSelect: document.getElementById("payment-method-select"),
        cashPaymentDetails: document.getElementById("cash-payment-details"),
        amountReceivedInput: document.getElementById("amount-received-input"),
        changeAmountDisplay: document.getElementById("change-amount-display"),
        processSaleButton: document.getElementById("process-sale-button"),
        saleVerse: document.getElementById("sale-verse")
    };

    const inventarioUI = {
        addProductButton: document.getElementById("add-product-button"),
        listContainer: document.getElementById("inventory-list-container"),
        openInventoryMovementModalButton: document.getElementById('open-inventory-movement-modal-button'),
        inventoryMovementsHistoryContainer: document.getElementById('inventory-movements-history-container'),
    };

    const usuariosUI = {
        addUserButton: document.getElementById("add-user-button"),
        listContainer: document.getElementById("user-list-container")
    };

    const cuadreCajaUI = {
        section: document.getElementById("cuadrecaja-section"),
        reportStartDate: document.getElementById("report-start-date"),
        reportEndDate: document.getElementById("report-end-date"),
        initialPettyCashInput: document.getElementById("initial-petty-cash-input"),
        generateReportButton: document.getElementById("generate-report-button"),
        searchInvoiceInput: document.getElementById("search-invoice-input"),
        searchInvoiceButton: document.getElementById("search-invoice-button"),
        printReportButton: document.getElementById("print-report-button"),
        // exportReportCsvButton: document.getElementById('export-report-csv-button'), // REMOVED
        reportDetailsContainer: document.getElementById("report-details-container"),
    };

    const salidaEntradaUI = {
        section: document.getElementById("salidaentrada-section"),
        addPettyCashDescriptionInput: document.getElementById("add-petty-cash-description-input"),
        addPettyCashAmountInput: document.getElementById("add-petty-cash-amount-input"),
        addPettyCashButton: document.getElementById("add-petty-cash-button"),
        outputDescriptionInput: document.getElementById("output-description-input"),
        outputAmountInput: document.getElementById("output-amount-input"),
        recordButton: document.getElementById("record-output-button"),
        cashMovementsHistoryContainer: document.getElementById("cash-movements-history-container"),
    };


    const modals = {
        adminCode: {
            element: document.getElementById("admin-code-modal"),
            message: document.getElementById("admin-code-modal-message"),
            input: document.getElementById("modal-admin-code-input"),
            verifyButton: document.getElementById("modal-verify-admin-code-button"),
            isSticky: true // Make admin code modal sticky
        },
        product: {
            element: document.getElementById("product-modal"),
            title: document.getElementById("product-modal-title"),
            nameInput: document.getElementById("product-name-input"),
            codeInput: document.getElementById("product-code-input"),
            categoryInput: document.getElementById('product-category-input'), // Moved category up
            priceInput: document.getElementById("product-price-input"),
            costInput: document.getElementById("product-cost-input"), // NEW: Cost input
            stockInput: document.getElementById("product-stock-input"),
            saveButton: document.getElementById("save-product-button"),
            isSticky: true // Make product modal sticky
        },
        user: {
            element: document.getElementById("user-modal"),
            title: document.getElementById("user-modal-title"),
            nameInput: document.getElementById("user-name-input"),
            usernameInput: document.getElementById("user-username-input"),
            emailInput: document.getElementById('user-email-input'), // NEW: Add email input reference
            idInput: document.getElementById("user-id-input"),
            passwordInput: document.getElementById("user-password-input"),
            roleSelect: document.getElementById("user-role-select"),
            generalCommissionEnabledCheckbox: document.getElementById("user-general-commission-enabled-checkbox"), // Renamed ID
            generalCommissionAmountInput: document.getElementById("user-general-commission-amount-input"), // Renamed ID
            generalCommissionAmountGroup: document.getElementById("user-general-commission-amount-group"), // Renamed ID
            hotdogCommissionEnabledCheckbox: document.getElementById("user-hotdog-commission-enabled-checkbox"), // NEW
            hotdogCommissionPerItemInput: document.getElementById("user-hotdog-commission-per-item-input"), // NEW
            hotdogCommissionAmountGroup: document.getElementById("user-hotdog-commission-amount-group"), // NEW
            isTeamAccountCheckbox: document.getElementById('user-is-team-account-checkbox'), // NEW
            saveButton: document.getElementById("save-user-button"),
            isSticky: true // Make user modal sticky
        },
        editCartItem: {
            element: document.getElementById("edit-cart-item-modal"),
            nameDisplay: document.getElementById("edit-cart-item-name"),
            quantityInput: document.getElementById("edit-cart-item-quantity"),
            priceInput: document.getElementById("edit-cart-item-price"),
            stockInfo: document.getElementById("edit-cart-item-stock-info"),
            saveButton: document.getElementById("save-edited-cart-item-button"),
            isSticky: true // Make edit cart item modal sticky
        },
        confirmAction: {
            element: document.getElementById("confirm-action-modal"),
            title: document.getElementById("confirm-modal-title"),
            message: document.getElementById("confirm-modal-message"),
            yesButton: document.getElementById("confirm-yes-button"),
            noButton: document.getElementById("confirm-no-button"),
            isSticky: true // Make confirm action modal sticky
        },
        invoicePreview: {
            element: document.getElementById("invoice-preview-modal"),
            content: document.getElementById("invoice-content"),
            printButton: document.getElementById("print-invoice-button"),
            deleteButton: document.getElementById("delete-invoice-button"),
            modifyButton: document.getElementById("modify-invoice-button"), // NEW
            closeButton: document.getElementById("close-invoice-modal-button"),
            isSticky: false // Invoice preview can be dismissed
        },
        inventoryMovement: {
            element: document.getElementById("inventory-movement-modal"),
            productSelect: document.getElementById("modal-inv-move-product-select"),
            typeSelect: document.getElementById("modal-inv-move-type-select"),
            quantityInput: document.getElementById("modal-inv-move-quantity-input"),
            descriptionInput: document.getElementById("modal-inv-move-description-input"),
            saveButton: document.getElementById("modal-record-inventory-movement-button"),
            isSticky: true // Make inventory movement modal sticky
        },
        setTeamMembers: { // NEW MODAL FOR TEAM MEMBERS
            element: document.getElementById('set-team-members-modal'),
            shiftNameInput: document.getElementById('shift-name-input'),
            teamMembersList: document.getElementById('team-members-selection-list'),
            printButton: document.getElementById('print-shift-report-button'), // NEW: Reference to the print button
            saveButton: document.getElementById('save-team-members-button'),
            isSticky: true // Make team members modal sticky
        }
    };


    // --- Event Listeners for Modals (Closing + X Button) ---
    // The "X" button (close-modal-button) still closes all modals
    document.querySelectorAll(".close-modal-button").forEach((btn) => {
        if (btn) btn.addEventListener("click", hideAllModals);
    });
    // The explicit "Cerrar" button on invoice preview modal also closes it
    if (modals.invoicePreview?.closeButton)
        modals.invoicePreview.closeButton.addEventListener("click", hideAllModals);

    // REMOVED: Generic click outside modal listener
    // Object.values(modals).forEach((modalObj) => {
    //     if (modalObj && modalObj.element) {
    //         modalObj.element.addEventListener("click", (e) => {
    //             if (e.target === modalObj.element) hideAllModals();
    //         });
    //     }
    // });

    // REMOVED: Per-modal keydown listener for Escape (handled globally now)
    // Object.values(modals).forEach((modalObj) => {
    //     if (modalObj && modalObj.element) {
    //         modalObj.element.addEventListener("keydown", (e) => {
    //             if (e.key === "Escape") {
    //                 hideAllModals();
    //             }
    //         });
    //     }
    // });


    // --- Theme Functions ---
    const applyTheme = (theme) => {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
            if (mainAppUI.themeToggleButton) {
                mainAppUI.themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
                mainAppUI.themeToggleButton.setAttribute(
                    "aria-label",
                    "Cambiar a tema claro"
                );
            }
        } else {
            document.body.classList.remove("dark-mode");
            if (mainAppUI.themeToggleButton) {
                mainAppUI.themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
                mainAppUI.themeToggleButton.setAttribute(
                    "aria-label",
                    "Cambiar a tema oscuro"
                );
            }
        }
        localStorage.setItem("appTheme", theme);
    };

    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains("dark-mode") ?
            "dark" :
            "light";
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    };

    // --- Authentication (using Firebase Auth) ---
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User authenticated:", user.uid);
                if (!db) {
                    console.error(
                        "Firestore is not initialized. Cannot fetch user metadata."
                    );
                    if (auth) auth.signOut();
                    showAlert(
                        "Error crítico: Base de datos no disponible. Intenta recargar.",
                        "error"
                    );
                    return;
                }
                try {
                    const userDoc = await db.collection("users").doc(user.uid).get();
                    if (userDoc.exists) {
                        currentUser = {
                            uid: user.uid,
                            email: user.email,
                            ...userDoc.data()
                        };
                        console.log("User metadata from Firestore:", currentUser);
                        // Usar el nombre de usuario si está disponible, si no el nombre, y si no el email
                        mainAppUI.currentUserDisplay.name.textContent =
                            currentUser.username || currentUser.name || user.email || "Usuario";
                        const displayId =
                            currentUser.id || user.uid.substring(0, 6) + "...";
                        if (mainAppUI.currentUserDisplay?.id)
                            mainAppUI.currentUserDisplay.id.textContent = `(ID: ${displayId})`;

                        showScreen(screens.mainApp);

                        updateUIVisibilityBasedOnRole();
                        showSection("ventas");
                        cart = [];
                        cartDiscountType = 'none';
                        cartDiscountValue = 0;
                        cartDiscountAmount = 0;
                        updateCartUI();
                        updateDateTime();
                        if (window._datetimeUpdateInterval) {
                            clearInterval(window._datetimeUpdateInterval);
                        }
                        window._datetimeUpdateInterval = setInterval(updateDateTime, 60000);
                        updateLowStockCount();
                        showToast(`¡Bienvenido, ${currentUser.username || currentUser.name || currentUser.email || 'Usuario'}!`, "success", 4000);

                        // NEW: Show "Set Team Members" button if this is a team account
                        if (mainAppUI.setTeamMembersButton) {
                            if (currentUser.isTeamAccount) {
                                mainAppUI.setTeamMembersButton.classList.remove('hidden');
                                if (!currentShiftTeamMembers.length && currentShiftName === '') { // Only prompt if no team members are set
                                    showToast("Por favor, configura los miembros del equipo para este turno.", "info", 5000);
                                }
                            } else {
                                mainAppUI.setTeamMembersButton.classList.add('hidden');
                                currentShiftTeamMembers = []; // Clear if not a team account
                                currentShiftName = '';
                            }
                        }

                    } else {
                        console.warn(
                            "User authenticated but no user document found in Firestore:",
                            user.uid
                        );
                        showAlert(
                            "Error: No se encontraron datos de usuario en Firestore para tu cuenta. Contacta al administrador para configurar tu perfil (nombre, rol, etc.).",
                            "error"
                        );
                        if (auth) auth.signOut();
                    }
                } catch (error) {
                    console.error("Error fetching user metadata from Firestore:", error);
                    if (error.code === "permission-denied") {
                        showAlert(
                            "Error de permisos al cargar tu perfil de usuario. Revisa tus Security Rules para la colección /users.",
                            "error"
                        );
                    } else {
                        showAlert(
                            "Error al cargar datos de usuario. Contacta al administrador.",
                            "error"
                        );
                    }
                    if (auth) auth.signOut();
                }
            } else {
                console.log("User not authenticated. Transitioning to login screen.");
                currentUser = null;
                cart = [];
                cartDiscountType = 'none';
                cartDiscountValue = 0;
                cartDiscountAmount = 0;
                updateCartUI();
                if (window._datetimeUpdateInterval) {
                    clearInterval(window._datetimeUpdateInterval);
                    window._datetimeUpdateInterval = null;
                }

                // Restore default hidden state for admin-only elements on logout
                // NOTE: This now only affects the 'Usuarios' nav link
                if (mainAppUI.adminOnlyElements)
                    mainAppUI.adminOnlyElements.forEach((el) =>
                        el.classList.add("hidden")
                    );
                if (cuadreCajaUI.printReportButton)
                    cuadreCajaUI.printReportButton.classList.add("hidden");
                // if (cuadreCajaUI.exportReportCsvButton) // REMOVED
                //    cuadreCajaUI.exportReportCsvButton.classList.add("hidden"); // REMOVED
                if (cuadreCajaUI.reportDetailsContainer)
                    cuadreCajaUI.reportDetailsContainer.innerHTML =
                    '<p class="placeholder-text">Selecciona un rango de fechas para generar el reporte o busca una factura por ID.</p>';
                if (salidaEntradaUI.addPettyCashDescriptionInput)
                    salidaEntradaUI.addPettyCashDescriptionInput.value = "";
                if (salidaEntradaUI.addPettyCashAmountInput)
                    salidaEntradaUI.addPettyCashAmountInput.value = "";
                if (salidaEntradaUI.outputDescriptionInput)
                    salidaEntradaUI.outputDescriptionInput.value = "";
                if (salidaEntradaUI.outputAmountInput)
                    salidaEntradaUI.outputAmountInput.value = "";
                if (inventarioUI.inventoryMovementsHistoryContainer)
                    inventarioUI.inventoryMovementsHistoryContainer.innerHTML =
                    '<p class="placeholder-text">Cargando historial de movimientos...</p>';
                updateLowStockCount();

                // NEW: Hide "Set Team Members" button on logout
                if (mainAppUI.setTeamMembersButton) {
                    mainAppUI.setTeamMembersButton.classList.add('hidden');
                    currentShiftTeamMembers = [];
                    currentShiftName = '';
                }

                showScreen(screens.login);
                if (loginForm.usernameInput) loginForm.usernameInput.focus();
            }
        });
    } else {
        console.error(
            "Firebase Auth not initialized. Authentication flow is disabled."
        );
    }

    const handleLogin = async () => {
        if (
            !auth ||
            !loginForm.usernameInput ||
            !loginForm.password ||
            !loginForm.loginButton ||
            !db
        ) {
            showAlert(
                "Sistema de autenticación o base de datos no disponible. Intenta recargar.",
                "error"
            );
            console.error("Attempted to login before auth, DB, or login form elements initialized.");
            return;
        }

        const username = loginForm.usernameInput.value.trim();
        const password = loginForm.password.value;

        if (!username || !password) {
            showAlert("Por favor, ingresa nombre de usuario y contraseña.", "warning");
            if (!username) loginForm.usernameInput.focus();
            else loginForm.password.focus();
            return;
        }

        loginForm.loginButton.disabled = true;
        loginForm.loginButton.textContent = "Accediendo...";

        try {
            console.log(`Buscando usuario en Firestore con username: "${username}"`);
            const userQuerySnapshot = await db.collection('users')
                .where('username', '==', username)
                .limit(1)
                .get();

            if (userQuerySnapshot.empty) {
                showAlert("Nombre de usuario o contraseña incorrectos.", "error");
                loginForm.password.value = "";
                loginForm.usernameInput.focus();
                return;
            }

            const userData = userQuerySnapshot.docs[0].data();
            const emailToLogin = userData.email;

            if (!emailToLogin) {
                showAlert("Error: El usuario no tiene un email asociado. Contacta al administrador.", "error");
                console.error("User found in Firestore but no email associated:", userData);
                loginForm.password.value = "";
                loginForm.usernameInput.focus();
                return;
            }

            console.log(`Intentando iniciar sesión con email: "${emailToLogin}"`);
            await auth.signInWithEmailAndPassword(emailToLogin, password);
            console.log("User signed in successfully. Waiting for onAuthStateChanged...");
            loginForm.usernameInput.value = "";
            loginForm.password.value = "";
        } catch (error) {
            console.error("Firebase Authentication Error:", error);
            let errorMessage = "Error de inicio de sesión.";
            switch (error.code) {
                case "auth/wrong-password":
                    errorMessage = "Nombre de usuario o contraseña incorrectos.";
                    break;
                case "auth/invalid-email":
                    errorMessage = "Error de configuración de usuario (email inválido). Contacta al administrador.";
                    break;
                case "auth/user-disabled":
                    errorMessage = "Tu cuenta ha sido deshabilitada.";
                    break;
                case "auth/network-request-failed":
                    errorMessage = "Problema de conexión. Revisa tu internet.";
                    break;
                default:
                    errorMessage += ` (${error.message})`;
                    break;
            }
            showAlert(errorMessage, "error");
            loginForm.password.value = "";
            loginForm.usernameInput.focus();
        } finally {
            if (loginForm.loginButton) {
                loginForm.loginButton.disabled = false;
                loginForm.loginButton.textContent = "Acceder";
            }
        }
    };

    const handleLogout = async () => {
        if (!auth) {
            showAlert(
                "Sistema de autenticación no disponible. Intenta recargar.",
                "error"
            );
            console.error("Auth is not initialized.");
            return;
        }
        try {
            await auth.signOut();
            console.log(
                "User signed out successfully. Explicitly showing login screen."
            );
            showScreen(screens.login);
        } catch (error) {
            console.error("Firebase Sign Out Error:", error);
            showAlert("Error al cerrar sesión.", "error");
        }
    };

    const handleForgotPassword = () => {
        if (!screens.recoverPassword || !recoverForm.backToLoginLink) {
            console.error("Recover password screen elements not found.");
            return;
        }

        showScreen(screens.recoverPassword);
        screens.recoverPassword
            .querySelector(".auth-container #admin-code-input")
            ?.classList.add("hidden");
        screens.recoverPassword
            .querySelector(".auth-container #verify-admin-code-button")
            ?.classList.add("hidden");
        screens.recoverPassword
            .querySelector(".auth-container #new-password-form")
            ?.classList.add("hidden");
        const fixedText = screens.recoverPassword.querySelector(
            ".auth-container p:not(#admin-code-modal-message)"
        );
        if (fixedText && fixedText.textContent.includes("Ingresa el código para continuar")) {
            fixedText.classList.add("hidden");
        }

        const authContainer = screens.recoverPassword.querySelector(
            ".auth-container"
        );
        if (!authContainer) {
            console.error("Auth container on recover screen not found.");
            return;
        }

        const existingEmailGroup = authContainer.querySelector(
            ".form-group #reset-email-input"
        )?.parentElement;
        if (existingEmailGroup) authContainer.removeChild(existingEmailGroup);
        if (authContainer.contains(recoverForm.sendResetEmailButton))
            authContainer.removeChild(recoverForm.sendResetEmailButton);

        const emailFormGroup = document.createElement("div");
        emailFormGroup.classList.add("form-group");
        const emailLabel = document.createElement("label");
        emailLabel.setAttribute("for", "reset-email-input");
        emailLabel.textContent = "Email registrado:";
        emailFormGroup.appendChild(emailLabel);
        emailFormGroup.appendChild(recoverForm.resetEmailInput);

        authContainer.insertBefore(emailFormGroup, recoverForm.backToLoginLink);
        authContainer.insertBefore(
            recoverForm.sendResetEmailButton,
            recoverForm.backToLoginLink
        );

        if (recoverForm.resetEmailInput) {
            recoverForm.resetEmailInput.value = "";
            recoverForm.resetEmailInput.focus();
        }
    };

    const sendPasswordResetEmail = async () => {
        if (
            !auth ||
            !recoverForm.resetEmailInput ||
            !recoverForm.sendResetEmailButton
        ) {
            showAlert(
                "Sistema de autenticación no disponible. Intenta recargar.",
                "error"
            );
            console.error("Auth or recover form elements not initialized.");
            return;
        }

        const email = recoverForm.resetEmailInput.value.trim();
        if (!email) {
            showAlert("Por favor, ingresa tu email.", "warning");
            return;
        }

        if (!recoverForm.resetEmailInput.checkValidity()) {
            showAlert("Por favor, ingresa un email válido.", "warning");
            recoverForm.resetEmailInput.focus();
            return;
        }

        recoverForm.sendResetEmailButton.disabled = true;
        recoverForm.sendResetEmailButton.textContent = "Enviando...";

        try {
            await auth.sendPasswordResetEmail(email);
            showAlert(
                `Se ha enviado un email de recuperación a ${email}. Revisa tu bandeja de entrada.`,
                "success"
            );
            setTimeout(() => {
                showScreen(screens.login);
            }, 3000);
        } catch (error) {
            console.error("Firebase Password Reset Error:", error);
            let errorMessage = "Error al enviar el email de recuperación.";
            switch (error.code) {
                case "auth/invalid-email":
                    errorMessage = "Formato de email inválido.";
                    break;
                case "auth/user-not-found":
                    errorMessage = "No existe un usuario con ese email.";
                    break;
                case "auth/too-many-requests":
                    errorMessage =
                        "Se han enviado demasiadas solicitudes de recuperación. Inténtalo más tarde.";
                    break;
                default:
                    errorMessage += ` (${error.message})`;
                    break;
            }
            showAlert(errorMessage, "error");
        } finally {
            if (recoverForm.sendResetEmailButton) {
                recoverForm.sendResetEmailButton.disabled = false;
                recoverForm.sendResetEmailButton.textContent =
                    "Enviar email de recuperación";
            }
            if (recoverForm.resetEmailInput) recoverForm.resetEmailInput.focus();
        }
    };


    // --- Navigation and UI ---
    const updateUIVisibilityBasedOnRole = () => {
        const isAdmin = currentUser && currentUser.role === "admin";
        const isColaborator = currentUser && currentUser.role === "colaborator";
        console.log("Updating UI based on role:", currentUser?.role);
        console.log("Is user admin?", isAdmin);

        // Hide 'Usuarios' nav link for collaborators
        document.querySelector('.nav-list li a[data-section="usuarios"]')?.parentElement.classList.toggle("hidden", !isAdmin);

        // Hide 'Set Team Members' button if current user is not a team account
        if (mainAppUI.setTeamMembersButton) {
            mainAppUI.setTeamMembersButton.classList.toggle('hidden', !currentUser?.isTeamAccount);
        }

        // Hide 'Add Product' button in Inventory section for collaborators
        if (inventarioUI.addProductButton) {
            inventarioUI.addProductButton.classList.toggle('hidden', !isAdmin);
        }

        // Hide 'Add User' button in Users section (already hidden for section) for collaborators
        if (usuariosUI.addUserButton) {
            usuariosUI.addUserButton.classList.toggle('hidden', !isAdmin);
        }
        
        // General admin-only elements (e.g. discount nav link)
        if (mainAppUI.discountNavLink) {
             mainAppUI.discountNavLink.parentElement.classList.toggle("hidden", !isAdmin);
        }

        // Specific visibility for print report button (only admins can print reports)
        if (cuadreCajaUI.printReportButton) {
            // MODIFICACIÓN: Permitir que las cuentas de equipo impriman reportes
            cuadreCajaUI.printReportButton.classList.toggle("hidden", !(currentReportData && (isAdmin || currentUser.isTeamAccount)));
        }

        // Invoice preview modal buttons: delete is admin-only, modify is for both but requires code for collab
        if (modals.invoicePreview?.element && !modals.invoicePreview.element.classList.contains("hidden")) {
            modals.invoicePreview.deleteButton?.classList.toggle("hidden", !isAdmin);
            // Modify button is visible for both roles, but requires admin code for collaborators.
            // It's already removed/added in showModal, so ensure it's not hidden if ID is present
            modals.invoicePreview.modifyButton?.classList.remove("hidden"); 
            if (!currentInvoiceId) { // If no invoice ID, cannot modify
                modals.invoicePreview.modifyButton?.classList.add("hidden");
            }
        }
    };


    const showSection = (sectionValue) => {
        const navLink = document.querySelector(`.nav-list a[data-section="${sectionValue}"]`);
        const isNavLinkAdminOnly = navLink?.parentElement?.classList.contains("admin-only");

        // If the nav link itself is marked as admin-only in HTML, only admins can click it.
        // This is for sections like "Usuarios" where collaborators should not even see the UI.
        if (isNavLinkAdminOnly && (!currentUser || currentUser.role !== "admin")) {
            showAlert("Acceso restringido. Solo administradores.", "warning");
            const activeSection = document.querySelector(".content-section.active");
            if (!activeSection) {
                showSection("ventas"); // Fallback to sales if no active section
            }
            return;
        }

        hideAllModals();

        if (mainAppUI.contentSections) {
            mainAppUI.contentSections.forEach((s) => {
                if (s && s.classList) s.classList.remove("active");
            });
        }
        const activeSection = document.getElementById(`${sectionValue}-section`);
        if (activeSection) {
            activeSection.classList.add("active");
        } else {
            console.error(`Section element not found for ID: ${sectionValue}-section`);
            showSection("ventas");
            return;
        }

        if (mainAppUI.navLinks) {
            mainAppUI.navLinks.forEach((link) => {
                if (link) link.classList.remove("active");
            });
        }
        if (navLink) {
            navLink.classList.add("active");
        }


        switch (sectionValue) {
            case "ventas":
                loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect?.value);
                updateCartUI();
                // Ensure applyPromoSection is hidden by default unless activated by discountNavLink click
                if(ventasUI.applyPromoSection) ventasUI.applyPromoSection.classList.add('hidden');
                break;
            case "inventario":
                loadInventoryFromFirestore();
                break;
            case "usuarios":
                loadUsersForManagement(); // This section will be hidden for collaborators
                break;
            case "cuadrecaja":
                if (cuadreCajaUI.reportDetailsContainer)
                    cuadreCajaUI.reportDetailsContainer.innerHTML =
                    '<p class="placeholder-text">Selecciona un rango de fechas para generar el reporte o busca una factura por ID.</p>';
                // Print button visibility is handled by updateUIVisibilityBasedOnRole and generateCashReport
                // if (cuadreCajaUI.printReportButton)
                //     cuadreCajaUI.printReportButton.classList.add("hidden");
                // if (cuadreCajaUI.exportReportCsvButton) // REMOVED
                //    cuadreCajaUI.exportReportCsvButton.classList.add("hidden"); // REMOVED
                // The report generation function will handle the business day logic
                const today = new Date();
                cuadreCajaUI.reportStartDate.valueAsDate = today;
                cuadreCajaUI.reportEndDate.valueAsDate = today;
                if (cuadreCajaUI.searchInvoiceInput)
                    cuadreCajaUI.searchInvoiceInput.value = "";
                currentReportData = null;
                // Only load products if current user is admin, otherwise product cache might be outdated/empty for reporting
                // NOTE: All users can now generate reports, so products need to be loaded regardless of role for product summaries.
                if (productsCache.length === 0) loadProductsFromFirestore();
                break;
            case "salidaentrada":
                if (salidaEntradaUI.addPettyCashDescriptionInput)
                    salidaEntradaUI.addPettyCashDescriptionInput.value = "";
                if (salidaEntradaUI.addPettyCashAmountInput)
                    salidaEntradaUI.addPettyCashAmountInput.value = "";
                if (salidaEntradaUI.outputDescriptionInput)
                    salidaEntradaUI.outputDescriptionInput.value = "";
                if (salidaEntradaUI.outputAmountInput)
                    salidaEntradaUI.outputAmountInput.value = "";
                renderRecentCashMovements();
                break;
            default:
                console.warn("Unknown section value:", sectionValue);
                showSection("ventas");
                return;
        }

        if (sectionValue !== "ventas" && cart.length > 0) {
            console.log("Clearing cart due to section change away from sales.");
            cart = [];
            cartDiscountType = 'none';
            cartDiscountValue = 0;
            cartDiscountAmount = 0;
            updateCartUI();
            resetSaleAfterCompletion();
        }
    };


    const renderProducts = (productsToRender) => {
        const productsGrid = ventasUI.productsGrid;
        if (!productsGrid) {
            console.error("Products grid element not found.");
            return;
        }

        productsGrid.innerHTML = "";
        if (productsToRender.length === 0) {
            productsGrid.innerHTML =
                '<p class="placeholder-text">No se encontraron productos que coincidan con la búsqueda o categoría.</p>';
            return;
        }
        productsToRender.forEach((product) => {
            if (!product || !product.id) {
                console.warn("Skipping product with missing ID:", product);
                return;
            }

            const item = document.createElement("div");
            item.classList.add("product-item");
            item.dataset.id = product.id;
            const stock = product.stock ?? 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD;

            if (isOutOfStock) {
                item.classList.add('out-of-stock');
            } else if (isLowStock) {
                item.classList.add('low-stock');
            }

            const displayPrice = product.price ?? 0;
            const displayName = product.name || "Producto sin nombre";

            item.innerHTML = `
                <h4>${displayName}</h4>
                <p>${formatPrice(displayPrice)}</p>
                <small>Stock: ${isOutOfStock ? "Agotado" : stock}</small>
            `;
            if (!isOutOfStock) {
                item.addEventListener("click", () => addProductToCart(product));
            }
            productsGrid.appendChild(item);
        });
    };

    const loadProductsFromFirestore = async (searchTerm = "", categoryFilter = "all") => {
        const productsGrid = ventasUI.productsGrid;
        if (!db || !productsGrid) {
            if (productsGrid)
                productsGrid.innerHTML =
                '<p class="placeholder-text" style="color:red;">Base de datos no disponible.</p>';
            console.error("DB or Products grid element not initialized.");
            return;
        }

        if (
            productsGrid.innerHTML.trim() === "" ||
            productsGrid.querySelector(".placeholder-text")
        ) {
            productsGrid.innerHTML =
                '<p class="placeholder-text">Cargando productos...</p>';
        }

        try {
            console.log("Fetching products from Firestore...");
            const snapshot = await db.collection("products").orderBy("name").get();
            productsCache = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Fetched ${productsCache.length} products.`);

            updateLowStockCount();

            let filtered = productsCache;
            const lowerSearchTerm = searchTerm.toLowerCase();

            if (lowerSearchTerm) {
                filtered = filtered.filter(
                    (p) =>
                    (p.name && String(p.name).toLowerCase().includes(lowerSearchTerm)) ||
                    (p.code && String(p.code).toLowerCase().includes(lowerSearchTerm))
                );
            }

            if (categoryFilter && categoryFilter !== "all") {
                filtered = filtered.filter(p => p.category && p.category.toLowerCase() === categoryFilter.toLowerCase());
            }

            console.log(`Filtered products (${searchTerm}, ${categoryFilter}): ${filtered.length}`);
            renderProducts(filtered);
        } catch (error) {
            console.error("Error cargando productos:", error);
            if (productsGrid) {
                if (error.code === "permission-denied") {
                    productsGrid.innerHTML =
                        '<p class="placeholder-text" style="color:red;">Acceso denegado. Revisa tus permisos (Security Rules).</p>';
                } else {
                    productsGrid.innerHTML =
                        '<p class="placeholder-text" style="color:red;">Error al cargar productos.</p>';
                    showAlert(
                        "No se pudieron cargar los productos. Revisa tu conexión o contacta al administrador.",
                        "error"
                    );
                }
            }
            productsCache = [];
            cart = [];
            cartDiscountType = 'none';
            cartDiscountValue = 0;
            cartDiscountAmount = 0;
            updateCartUI();
            updateLowStockCount();
        }
    };

    const addProductToCart = (product) => {
        console.log("Attempting to add product to cart:", product);
        if (!product || !product.id || typeof product.price === "undefined") {
            console.error("Invalid product object received for cart:", product);
            showAlert("Error interno: Información del producto incompleta.", "error");
            return;
        }

        const existingItem = cart.find((item) => item.id === product.id);
        const productInCache = productsCache.find((p) => p.id === product.id);

        const availableStock = productInCache?.stock ?? 0;

        if (availableStock <= 0) {
            showAlert(`"${product.name || "Producto"}" está agotado.`, "warning");
            console.log("Product out of stock:", product.name);
            loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect?.value);
            return;
        }

        const currentQuantityInCart = existingItem?.quantity ?? 0;
        if (currentQuantityInCart + 1 > availableStock) {
            showAlert(
                `No hay más stock disponible para "${
          product.name || "Producto"
        }". Solo quedan ${availableStock} unidades.`,
                "warning"
            );
            if (existingItem) {
                existingItem.quantity = availableStock;
            }
            updateCartUI();
            return;
        }

        if (existingItem) {
            existingItem.quantity++;
            console.log(
                `Incremented quantity for existing item: ${product.name}, New quantity: ${existingItem.quantity}`
            );
        } else {
            const itemPrice = typeof product.price === 'number' ? product.price : 0;
            const itemCostPrice = typeof product.costPrice === 'number' ? product.costPrice : 0; // NEW: get costPrice
            cart.push({
                id: product.id,
                name: product.name || "Producto sin nombre",
                price: itemPrice,
                costPrice: itemCostPrice, // NEW: add costPrice to cart item
                quantity: 1
            });
            console.log(`Added new product to cart: ${product.name}`);
        }
        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        console.log("Cart state after adding:", [...cart]);
    };

    const addProductToCartByCode = (productCode) => {
        const productFound = productsCache.find(p => p.code && p.code.toLowerCase() === productCode.toLowerCase());
        if (productFound) {
            addProductToCart(productFound);
        } else {
            showToast(`Producto con código "${productCode}" no encontrado.`, "warning");
        }
    };

    const removeProductFromCart = (productId) => {
        console.log("Attempting to remove product from cart:", productId);
        const itemIndex = cart.findIndex((item) => item.id === productId);
        if (itemIndex > -1) {
            cart[itemIndex].quantity--;
            if (cart[itemIndex].quantity <= 0) {
                cart.splice(itemIndex, 1);
                console.log(`Removed item from cart: ${productId}`);
            } else {
                console.log(
                    `Decremented quantity for item: ${productId}, New quantity: ${cart[itemIndex].quantity}`
                    );
            }
        } else {
            console.warn(`Attempted to remove item not found in cart: ${productId}`);
        }
        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        console.log("Cart state after removal:", [...cart]);
    };

    const openEditCartItemModal = (item) => {
        // Now, collaborators can access this via admin code
        const modal = modals.editCartItem;
        if (
            !modal?.element ||
            !modal.nameDisplay ||
            !modal.quantityInput ||
            !modal.priceInput ||
            !modal.stockInfo ||
            !modal.saveButton
        ) {
            console.error("Edit cart item modal elements not found.");
            return;
        }

        const cartItemToEdit = cart.find((cartItem) => cartItem.id === item.id);
        if (!cartItemToEdit) {
            console.error("Attempted to edit cart item not found in cart:", item);
            showAlert("Error: Item no encontrado en el carrito.", "error");
            hideAllModals();
            return;
        }

        showModal(modal, cartItemToEdit);
    };

    const handleSaveEditedCartItem = () => {
        // This action can be performed by collaborators AFTER admin code verification
        const modal = modals.editCartItem;
        if (
            !modal?.element ||
            !modal.quantityInput ||
            !modal.priceInput ||
            !modal.saveButton
        ) {
            console.error("Edit cart item modal elements not found for save.");
            return;
        }

        if (!editingCartItemId) {
            console.error(
                "Attempted to save edited item but no editingCartItemId is set."
            );
            showAlert(
                "Error interno: No se pudo identificar el item a guardar.",
                "error"
            );
            return;
        }

        const itemToUpdate = cart.find((item) => item.id === editingCartItemId);
        if (!itemToUpdate) {
            console.error(
                "Attempted to save edited item not found in cart:",
                editingCartItemId
            );
            showAlert("Error: Item no encontrado en el carrito.", "error");
            hideAllModals();
            return;
        }

        const newQuantity = parseInt(modal.quantityInput.value, 10);
        const newPrice = parseFloat(modal.priceInput.value);

        if (isNaN(newQuantity) || newQuantity < 1) {
            showAlert(
                "La cantidad debe ser un número entero mayor o igual a 1.",
                "warning"
            );
            modal.quantityInput.focus();
            return;
        }
        if (isNaN(newPrice) || newPrice < 0) {
            showAlert("El precio debe ser un número mayor o igual a 0.", "warning");
            modal.priceInput.focus();
            return;
        }

        const productInCache = productsCache.find(
            (p) => p.id === editingCartItemId
        );
        const availableStock = productInCache?.stock ?? 0;

        if (newQuantity > availableStock) {
            showAlert(
                `No hay suficiente stock disponible. Solo quedan ${availableStock} unidades.`,
                "warning"
            );
            modal.quantityInput.value = availableStock;
            modal.quantityInput.focus();
            return;
        }

        itemToUpdate.quantity = newQuantity;
        itemToUpdate.price = newPrice;
        // Keep costPrice original or update if product data changed (for simplicity, we assume costPrice is fixed unless product edited)

        console.log(
            `Updated cart item (ID: ${editingCartItemId}). New quantity: ${newQuantity}, New price: ${newPrice}`
        );

        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        hideAllModals();
    };

    const calculateCartSubtotal = () => {
        return cart.reduce(
            (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
            0
        );
    };

    const calculateCartDiscount = () => {
        let discount = 0;
        const subtotal = calculateCartSubtotal();

        if (cartDiscountType === 'hotdog2x150') {
            const hotDogItems = cart.filter(item => {
                const itemNameLower = (item.name || '').toLowerCase();
                return HOT_DOG_PRODUCT_NAMES_FOR_PROMO.some(promoNamePart => itemNameLower.includes(promoNamePart));
            });

            if (hotDogItems.length === 0) {
                console.log("No Hot Dogs found for 2 for 150 calculation.");
                return 0;
            }

            const totalHotDogQuantity = hotDogItems.reduce(
                (sum, item) => sum + (item.quantity ?? 0),
                0
            );

            if (totalHotDogQuantity < 2) {
                console.log("Less than 2 Hot Dogs, no 2 for 150 discount applied.");
                return 0;
            }

            const numPromoPairs = Math.floor(totalHotDogQuantity / 2);

            let totalOriginalHotDogPrice = 0;
            hotDogItems.forEach(item => {
                totalOriginalHotDogPrice += (item.price ?? 0) * (item.quantity ?? 0);
            });

            const promoPriceForPairedHotDogs = numPromoPairs * HOT_DOG_PROMO_PRICE_PER_PAIR;

            discount = Math.max(0, totalOriginalHotDogPrice - promoPriceForPairedHotDogs);

        } else if (cartDiscountType === 'percentage') {
            discount = (subtotal * (cartDiscountValue / 100)) || 0;
        } else if (cartDiscountType === 'fixed') {
            discount = cartDiscountValue || 0;
        }

        return Math.min(discount, subtotal);
    };


    const updateCartUI = () => {
        const itemsList = cartUI.itemsList;
        const placeholder = cartUI.placeholder;
        const paymentMethodSection = cartUI.paymentMethodSection;
        const processSaleButton = cartUI.processSaleButton;
        const saleVerse = cartUI.saleVerse;
        const subtotalAmountDisplay = cartUI.subtotalAmountDisplay;
        const discountAmountSummary = cartUI.discountAmountSummary;
        const discountAmountDisplay = cartUI.discountAmountDisplay;
        const totalAmountSummary = cartUI.totalAmountSummary;
        const totalAmountDisplay = cartUI.totalAmountDisplay;

        const appliedDiscountDisplay = cartUI.appliedDiscountDisplay;
        const clearDiscountButton = cartUI.clearDiscountButton;

        if (
            !itemsList || !placeholder || !paymentMethodSection || !processSaleButton || !saleVerse ||
            !subtotalAmountDisplay || !discountAmountSummary || !discountAmountDisplay ||
            !totalAmountSummary || !totalAmountDisplay || !appliedDiscountDisplay || !clearDiscountButton
        ) {
            console.error("Cart UI elements not fully loaded. Some features may not work.", {
                itemsList,
                placeholder,
                paymentMethodSection,
                processSaleButton,
                saleVerse,
                subtotalAmountDisplay,
                discountAmountSummary,
                discountAmountDisplay,
                totalAmountSummary,
                totalAmountDisplay,
                appliedDiscountDisplay,
                clearDiscountButton
            });
        }

        console.log(
            "Updating Cart UI. Current cart:", [...cart],
            "Discount Type:", cartDiscountType,
            "Discount Value:", cartDiscountValue,
            "Discount Amount (calculated):", formatPrice(cartDiscountAmount)
        );

        itemsList.innerHTML = "";
        const subtotal = calculateCartSubtotal();
        cartDiscountAmount = calculateCartDiscount();
        const total = subtotal - cartDiscountAmount;

        if (clearDiscountButton) {
            clearDiscountButton.removeEventListener("click", handleClearDiscount);
            if (cartDiscountAmount > 0) {
                clearDiscountButton.addEventListener("click", () => {
                    // Collaborators need admin code to clear discount
                    if (currentUser && currentUser.role === 'colaborator') {
                        showModal(modals.adminCode, 'eliminar descuento', handleClearDiscount);
                    } else {
                        handleClearDiscount();
                    }
                });
                // CORRECCIÓN: Se eliminó la llave de cierre extra aquí.
            }
        }

        if (cart.length === 0) {
            placeholder?.classList.remove("hidden");
            saleVerse?.classList.add("hidden");
        } else {
            placeholder?.classList.add("hidden");
            if (cartUI.saleVerse) cartUI.saleVerse.classList.add("hidden");

            cart.forEach((item) => {
                const li = document.createElement("li");
                li.classList.add("cart-item");
                const itemNameDisplay =
                    (item.name || "Producto").length > 20 ?
                    (item.name || "Producto").substring(0, 17) + "..." :
                    item.name || "Producto";
                const itemTotalPrice = (item.price ?? 0) * (item.quantity ?? 0);
                li.innerHTML = `
                    <span>${item.quantity ?? 0}x ${itemNameDisplay}</span>
                    <span>${formatPrice(itemTotalPrice)}</span>
                     <div class="item-actions">
                        <button class="icon-button small edit-item-button" data-id="${
                          item.id
                        }" title="Editar Item" aria-label="Editar ${
          item.name || "Producto"
        } en carrito"><i class="fas fa-edit"></i></button>
                        <button class="icon-button small remove-item-button" data-id="${
                          item.id
                        }" title="Remover Item" aria-label="Remover ${
          item.name || "Producto"
        } del carrito"><i class="fas fa-times-circle"></i></button>
                     </div>
                `;

                const removeButton = li.querySelector(".remove-item-button");
                if (removeButton) {
                    removeButton.addEventListener("click", (e) => {
                        const idToRemove = e.target.closest(".remove-item-button")?.dataset
                            .id;
                        if (idToRemove) {
                            removeProductFromCart(idToRemove);
                        }
                    });
                }
                const editButton = li.querySelector(".edit-item-button");
                // Collaborators can edit cart item with admin code
                if (editButton) {
                    editButton.addEventListener("click", () => {
                        // Check if current user is collaborator, then show admin code modal
                        if (currentUser && currentUser.role === 'colaborator') {
                            showModal(modals.adminCode, "editar item del carrito", () =>
                                openEditCartItemModal(item)
                            );
                        } else {
                            // If admin, proceed directly
                            openEditCartItemModal(item);
                        }
                    });
                }
                itemsList.appendChild(li); 
            });
        }

        if (subtotalAmountDisplay)
            subtotalAmountDisplay.textContent = formatPrice(subtotal);
        if (totalAmountDisplay) totalAmountDisplay.textContent = formatPrice(total);

        if (cartDiscountAmount > 0) {
            discountAmountSummary?.classList.remove("hidden");
            if (discountAmountDisplay)
                discountAmountDisplay.textContent = `- ${formatPrice(cartDiscountAmount)}`;
            appliedDiscountDisplay?.classList.remove("hidden");
            const appliedDiscountSpan = appliedDiscountDisplay?.querySelector("span");
            if (appliedDiscountSpan) {
                let promoText = '';
                if (cartDiscountType === 'hotdog2x150') {
                    promoText = `Promo: 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)}`;
                } else if (cartDiscountType === 'percentage') {
                    promoText = `Desc: ${cartDiscountValue}%`;
                } else if (cartDiscountType === 'fixed') {
                    promoText = `Desc: ${formatPrice(cartDiscountValue)}`;
                }
                appliedDiscountSpan.textContent = promoText;
            }

        } else {
            discountAmountSummary?.classList.add("hidden");
            if (discountAmountDisplay)
                discountAmountDisplay.textContent = formatPrice(0);
            appliedDiscountDisplay?.classList.add("hidden");
            const appliedDiscountSpan = appliedDiscountDisplay?.querySelector("span");
            if (appliedDiscountSpan) appliedDiscountSpan.textContent = "";
        }

        if (cart.length > 0) {
            paymentMethodSection?.classList.remove("hidden");
        } else {
            paymentMethodSection?.classList.add("hidden");
        }

        updateChangeDisplay(total);
    };

    const updateChangeDisplay = (currentTotal) => {
        const processSaleButton = cartUI.processSaleButton;
        const cashPaymentDetails = cartUI.cashPaymentDetails;
        const amountReceivedInput = cartUI.amountReceivedInput;
        const changeAmountDisplay = cartUI.changeAmountDisplay;
        const paymentMethodSelect = cartUI.paymentMethodSelect;

        if (
            !processSaleButton || !cashPaymentDetails || !amountReceivedInput ||
            !changeAmountDisplay || !paymentMethodSelect
        ) {
            console.error("Change display UI elements not fully loaded.");
            return;
        }

        const total = currentTotal || 0;
        const amountReceivedInputVal = parseFloat(amountReceivedInput.value ?? "0") || 0;

        let change = 0;
        let canProcess = cart.length > 0 && total >= 0;

        const selectedMethod = paymentMethodSelect.value;

        // If payment method is cash, display cash details and calculate change
        if (selectedMethod === "efectivo") {
            cashPaymentDetails.classList.remove("hidden");
            amountReceivedInput.disabled = false;

            change = amountReceivedInputVal - total;
            if (amountReceivedInputVal < total) {
                canProcess = false;
                console.log("Cannot process: Amount received is insufficient.");
            }
        } else { // For any other method (tarjeta, transferencia, credito, otro)
            cashPaymentDetails.classList.add("hidden");
            amountReceivedInput.disabled = true;
            change = 0; // No change for non-cash payments
        }

        changeAmountDisplay.textContent = formatPrice(Math.max(0, change));
        console.log("Calculated change:", change);

        processSaleButton.disabled = !canProcess;
        console.log("Process button disabled:", !canProcess);
    };

    const handleApplyHotDogPromo = () => {
        // Collaborators can apply this promo AFTER admin code verification
        const hotDogItems = cart.filter(item => {
            const itemNameLower = (item.name || '').toLowerCase();
            return HOT_DOG_PRODUCT_NAMES_FOR_PROMO.some(promoNamePart => itemNameLower.includes(promoNamePart));
        });
        const totalHotDogQuantity = hotDogItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

        if (totalHotDogQuantity < 2) {
            showToast(
                `Añade al menos 2 Hot Dogs al carrito para aplicar la promoción 2 por ${HOT_DOG_PROMO_PRICE_PER_PAIR}.`,
                "warning"
            );
            return;
        }

        if (cartDiscountType !== 'none' && cartDiscountType !== 'hotdog2x150') {
            showModal(modals.confirmAction, "Reemplazar Descuento", "Ya hay un descuento aplicado. ¿Deseas reemplazarlo con la promoción de Hot Dogs?", () => {
                cartDiscountType = 'hotdog2x150';
                cartDiscountValue = 0;
                updateCartUI();
                showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
            });
            return;
        }

        if (cartDiscountType === 'hotdog2x150') {
            showToast("La promoción de Hot Dogs ya está aplicada.", "info");
            return;
        }

        // Apply hotdog promo directly if admin, or via admin code for collaborator
        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, `aplicar promoción 2 Hot Dogs por ${HOT_DOG_PROMO_PRICE_PER_PAIR}`, () => {
                cartDiscountType = 'hotdog2x150';
                cartDiscountValue = 0;
                updateCartUI();
                showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
            });
        } else {
            cartDiscountType = 'hotdog2x150';
            cartDiscountValue = 0;
            updateCartUI();
            showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
            ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
        }
    };

    const handleApplyManualDiscount = () => {
        // Collaborators can apply this discount AFTER admin code verification
        if (cart.length === 0) {
            showToast("El carrito está vacío. Añade productos para aplicar un descuento.", "warning");
            return;
        }

        const type = ventasUI.discountTypeSelect.value;
        const value = parseFloat(ventasUI.discountValueInput.value);

        if (type === 'none' || isNaN(value) || value < 0) {
            showToast("Selecciona un tipo de descuento y un valor válido (>= 0).", "warning");
            ventasUI.discountValueInput.focus();
            return;
        }
        if (type === 'percentage' && value > 100) {
            showToast("El porcentaje de descuento no puede ser mayor a 100%.", "warning");
            ventasUI.discountValueInput.focus();
            return;
        }

        if (cartDiscountType !== 'none') {
            showModal(modals.confirmAction, "Reemplazar Descuento", "Ya hay un descuento aplicado. ¿Deseas reemplazarlo con este nuevo descuento?", () => {
                cartDiscountType = type;
                cartDiscountValue = value;
                updateCartUI();
                showToast(`Descuento de ${type === 'percentage' ? value + '%' : formatPrice(value)} aplicado.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
            });
            return;
        }

        // Apply manual discount directly if admin, or via admin code for collaborator
        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, `aplicar descuento ${type === 'percentage' ? value + '%' : formatPrice(value)}`, () => {
                cartDiscountType = type;
                cartDiscountValue = value;
                updateCartUI();
                showToast(`Descuento de ${type === 'percentage' ? value + '%' : formatPrice(value)} aplicado.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
            });
        } else {
            cartDiscountType = type;
            cartDiscountValue = value;
            updateCartUI();
            showToast(`Descuento de ${type === 'percentage' ? value + '%' : formatPrice(value)} aplicado.`, "success");
            ventasUI.applyPromoSection.classList.add('hidden'); // Hide promo section after applying
        }
    };

    const handleClearDiscount = () => {
        // Collaborators can clear discount AFTER admin code verification
        if (cartDiscountType === 'none') {
            return;
        }

        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        showToast("Descuento eliminado.", "info");
        if (ventasUI.discountTypeSelect) ventasUI.discountTypeSelect.value = 'none';
        if (ventasUI.discountValueInput) ventasUI.discountValueInput.value = '';
        if (ventasUI.discountValueGroup) ventasUI.discountValueGroup.classList.add('hidden');
    };

    /**
     * Generates the invoice HTML content.
     * @param {object} sale - The sale data object.
     * @param {boolean} isCustomerCopy - True if this is for the customer (hide profit/cost, user names).
     * @param {boolean} forAdminReport - True if this is for an admin's internal report (show sensitive data like profit, full user details), overrides isCustomerCopy if true.
     * @returns {string} The formatted invoice HTML string.
     */
    const generateInvoiceHTML = (sale, isCustomerCopy = true, forAdminReport = false) => {
        const saleTimestamp = sale.timestamp?.toDate ?
            sale.timestamp.toDate() :
            new Date(sale.timestamp);
        const formattedTimestamp = saleTimestamp?.toLocaleString("es-DO") || "N/A";

        let invoice = ``;
        invoice += `    La Hotdoguería RD\n`;
        invoice += `  "El clásico que nunca falla"\n`;
        invoice += ` Av MTS - salida Cabrera, Nagua.\n`;
        invoice += `----------------------------------\n`;
        invoice += `\n`;
        invoice += `ID Venta: ${sale.id || "N/A"}\n`;
        invoice += `Fecha/Hora: ${formattedTimestamp}\n`;
        
        // Show vendor info and team members only for admin reports
        if (forAdminReport) {
            invoice += `Vendedor: ${sale.vendedorNombre || "Desconocido"} (ID: ${
                sale.vendedorId ? sale.vendedorId.substring(0, 6) + "..." : "N/A"
            })\n`;
            if (sale.shiftTeamMembers && sale.shiftTeamMembers.length > 0) {
                invoice += `Equipo: ${sale.shiftTeamMembers.join(', ')}\n`;
                if (sale.shiftName) {
                    invoice += `Turno: ${sale.shiftName}\n`;
                }
            }
        }
        invoice += `----------------------------------\n`;
        invoice += `Items:\n`;

        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach((item) => {
                const itemName = (item.name || "Producto").padEnd(20).substring(0, 20);
                const itemQuantity = item.quantity ?? 0;
                const itemPrice = item.price ?? 0;
                const itemTotal = formatPrice(itemQuantity * itemPrice);
                invoice += `${String(itemQuantity).padEnd(3)} ${itemName} ${itemTotal.padStart(8)}`;
                
                // Show profit/cost only for admin reports
                if (forAdminReport) { 
                    const itemCostPrice = item.costPriceAtTimeOfSale ?? 0;
                    const itemProfit = (itemPrice - itemCostPrice) * itemQuantity;
                    invoice += ` (Costo: ${formatPrice(itemCostPrice*itemQuantity)}, Ganancia: ${formatPrice(itemProfit)})`;
                }
                invoice += `\n`;
            });
        } else {
            invoice += `  Sin detalles de items\n`;
            console.warn(
                "Sale items array is missing or invalid for invoice:",
                sale.id,
                sale.items
            );
        }

        invoice += `----------------------------------\n`;
        const subtotal = sale.subtotal ?? sale.total ?? 0;
        const discountAmount = sale.discountAmount ?? 0;
        const totalProfit = sale.totalProfit ?? 0; // NEW
        const totalHotdogCommission = sale.totalHotdogCommission ?? 0; // NEW


        invoice += `Subtotal: ${formatPrice(subtotal)}\n`;
        if (discountAmount > 0) {
            let discountDescription = '';
            if (sale.discountTypeApplied === 'hotdog2x150') {
                discountDescription = `Promo 2x$${HOT_DOG_PROMO_PRICE_PER_PAIR}`;
            } else if (sale.discountTypeApplied === 'percentage') {
                discountDescription = `Desc. (${sale.discountValueApplied ?? 0}%)`;
            } else if (sale.discountTypeApplied === 'fixed') {
                discountDescription = `Desc. Fijo`;
            } else {
                discountDescription = `Descuento`;
            }
            invoice += `${discountDescription}: ${formatPrice(discountAmount)}\n`;
        }
        invoice += `Total: ${formatPrice(sale.total ?? 0)}\n`;
        invoice += `Método de Pago: ${
      sale.metodoPago ? sale.metodoPago.toUpperCase() : "N/A"
    }\n`;

        if (sale.metodoPago === "efectivo") {
            invoice += `Monto Recibido: ${formatPrice(
        sale.montoRecibido ?? (sale.total ?? 0)
      )}\n`; // Use sale.total if montoRecibido is not set
            invoice += `Cambio: ${formatPrice(sale.cambio ?? 0)}\n`;
        }

        // Show total profit and commission ONLY for admin reports
        if (forAdminReport) {
            invoice += `----------------------------------\n`;
            invoice += `Ganancia Neta de la Venta: ${formatPrice(totalProfit)}\n`; // NEW
            if (totalHotdogCommission > 0) { // NEW
                invoice += `Comisión Hotdogs Generada: ${formatPrice(totalHotdogCommission)}\n`; // NEW
            }
            invoice += `----------------------------------\n`;
        }

        invoice += `¡Gracias por su compra, vuelva pronto!\n`;
        invoice += `       Jehová Jiréh\n`;
        invoice += `----------------------------------\n`;

        return invoice;
    };

    const handleProcessSale = async () => {
        console.log('handleProcessSale iniciado.');

        if (
            !db || !currentUser || !cartUI.processSaleButton || !cartUI.totalAmountDisplay ||
            !cartUI.paymentMethodSelect || !cartUI.amountReceivedInput || !cartUI.saleVerse
        ) {
            showAlert("La aplicación no está completamente cargada o no hay usuario. Intenta recargar.", "error");
            console.error("Attempted to process sale before db initialized, user logged in, or UI elements not found.");
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.disabled = false;
                cartUI.processSaleButton.style.opacity = 1;
            }
            return;
        }

        if (cart.length === 0) {
            showAlert("El carrito está vacío. Añade productos para procesar la venta.", "warning");
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.disabled = false;
                cartUI.processSaleButton.style.opacity = 1;
            }
            return;
        }

        // NEW: Check if this is a shared account and if team members are set
        if (currentUser.isTeamAccount && currentShiftTeamMembers.length === 0) {
            showAlert("Por favor, configura los miembros del equipo para este turno antes de procesar ventas.", "warning");
            if (mainAppUI.setTeamMembersButton) mainAppUI.setTeamMembersButton.focus();
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.disabled = false;
                cartUI.processSaleButton.style.opacity = 1;
            }
            return;
        }


        const subtotal = calculateCartSubtotal();
        const discountAmount = cartDiscountAmount;
        const total = subtotal - discountAmount;

        const method = cartUI.paymentMethodSelect.value;
        // Only set amountReceived if method is efectivo, otherwise it's just the total of the sale
        const amountReceived =
            method === "efectivo" ?
            parseFloat(cartUI.amountReceivedInput.value ?? "0") || 0 :
            total;
        const change =
            method === "efectivo" ? Math.max(0, amountReceived - total) : 0;

        if (method === "efectivo" && amountReceived < total) {
            showAlert("El monto recibido en efectivo es insuficiente para completar la venta.", "warning");
            updateChangeDisplay(total);
            cartUI.amountReceivedInput.focus();
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.style.opacity = 1;
            }
            return;
        }

        cartUI.processSaleButton.disabled = true;
        cartUI.processSaleButton.textContent = "Procesando...";
        cartUI.processSaleButton.style.opacity = 0.7;

        let totalProfit = 0; // NEW
        let totalHotdogCommission = 0; // NEW

        const saleItemsForFirestore = cart.map((item) => {
            const productData = productsCache.find(p => p.id === item.id);
            const costPriceAtTimeOfSale = productData?.costPrice ?? 0; // NEW: Get cost price from cached product
            const profitPerItem = (item.price - costPriceAtTimeOfSale) * item.quantity; // NEW: Calculate profit per item

            totalProfit += profitPerItem; // NEW: Add to total profit for the sale

            // Check for hotdog commission IF current user is an INDIVIDUAL account or a shared account that tracks commission per sale
            const isHotdog = HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION.some(keyword =>
                (item.name || '').toLowerCase().includes(keyword.toLowerCase())
            );

            // Calculate hotdog commission ONLY if the CURRENT logged-in user is set to receive it per item
            if (isHotdog && currentUser.hotdogCommissionEnabled && currentUser.hotdogCommissionPerItem > 0) {
                totalHotdogCommission += (item.quantity * currentUser.hotdogCommissionPerItem);
            }

            return {
                id: item.id,
                name: item.name || "Producto sin nombre",
                price: item.price ?? 0,
                costPriceAtTimeOfSale: costPriceAtTimeOfSale, // NEW: Include cost price in sale item
                profitPerItem: profitPerItem, // NEW: Include profit per item
                quantity: item.quantity ?? 0
            };
        });


        const saleData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            vendedorId: currentUser.uid,
            vendedorNombre: currentUser.username || currentUser.name || "Desconocido", // Use username for consistency
            items: saleItemsForFirestore,
            subtotal: subtotal,
            discountAmount: discountAmount,
            discountTypeApplied: cartDiscountType,
            discountValueApplied: cartDiscountValue,
            total: total,
            totalProfit: totalProfit, // NEW: Total profit for the entire sale
            totalHotdogCommission: totalHotdogCommission, // NEW: Total hotdog commission for the sale
            metodoPago: method,
            montoRecibido: amountReceived, // amount received will be total if not efectivo
            cambio: change
        };

        // NEW: Add team members to sale data if it's a shared account and team is set
        if (currentUser.isTeamAccount && currentShiftTeamMembers.length > 0) {
            saleData.shiftTeamMembers = currentShiftTeamMembers;
            saleData.shiftName = currentShiftName || `Turno ${new Date().toLocaleDateString('es-DO')}`;
        }

        const batch = db.batch();

        try {
            const saleDocRef = db.collection("sales").doc();
            const saleId = saleDocRef.id;
            const finalSaleDataForFirestore = { ...saleData,
                id: saleId
            };
            batch.set(saleDocRef, finalSaleDataForFirestore);

            for (const cartItem of cart) {
                const productRef = db.collection("products").doc(cartItem.id);
                const productSnapshot = await productRef.get();

                if (!productSnapshot.exists) {
                    console.error(
                        `Error de stock: Producto ${cartItem.id} no encontrado en Firestore.`
                    );
                    showAlert(
                        `Error: Producto "${
              cartItem.name || "Producto"
            }" no encontrado en el inventario durante la venta. Venta cancelada.`,
                        "error"
                    );
                    throw new Error("Product not found in Firestore.");
                }
                const productData = productSnapshot.data();
                const currentStock = productData.stock ?? 0;
                const quantityToDecrement = cartItem.quantity ?? 0;

                if (currentStock < quantityToDecrement) {
                    console.error(
                        `Error de stock: Producto ${cartItem.id} (${
              cartItem.name || "Producto"
            }) con stock insuficiente. Requerido: ${quantityToDecrement}, Disponible: ${currentStock}`
                    );
                    showAlert(
                        `Error: Stock insuficiente para "${
              cartItem.name || "Producto"
            }". Venta cancelada. Stock actual: ${currentStock}`,
                        "error"
                    );
                    throw new Error(
                        "Stock insuficiente detectado durante la actualización."
                    );
                }
                batch.update(productRef, {
                    stock: firebase.firestore.FieldValue.increment(-quantityToDecrement)
                });
            }

            await batch.commit();

            showAlert(
                `Venta #${saleId.substring(0, 6)} procesada con éxito!`,
                "success"
            );
            if (cartUI.saleVerse) cartUI.saleVerse.classList.remove("hidden");

            const savedSaleDoc = await db.collection("sales").doc(saleId).get();
            if (savedSaleDoc.exists) {
                const savedSaleData = {
                    id: savedSaleDoc.id,
                    ...savedSaleDoc.data()
                };
                
                const isAdmin = currentUser && currentUser.role === "admin";
                // Determine which invoice content to show in the modal (internal for admins, customer copy for collaborators)
                const invoiceTextForModal = generateInvoiceHTML(savedSaleData, !isAdmin, isAdmin); 

                // Always print customer copy first
                const invoiceTextCustomer = generateInvoiceHTML(savedSaleData, true, false); 
                printInvoiceContent(invoiceTextCustomer, "Factura de Cliente", () => {
                    // Then print the internal copy (with admin info if admin)
                    const invoiceTextInternal = generateInvoiceHTML(savedSaleData, false, isAdmin);
                    let finalInvoiceTextInternal = invoiceTextInternal;
                    // Add "COPIA PARA EL VENDEDOR" label to internal copy
                    const label = "\n\n        ****** COPIA PARA EL VENDEDOR ******\n\n";
                    const lastLineIndex = finalInvoiceTextInternal.lastIndexOf("----------------------------------");
                    if (lastLineIndex !== -1) {
                        finalInvoiceTextInternal = finalInvoiceTextInternal.substring(0, lastLineIndex) + label + finalInvoiceTextInternal.substring(lastLineIndex);
                    } else {
                        finalInvoiceTextInternal += label;
                    }
                    setTimeout(() => {
                        printInvoiceContent(finalInvoiceTextInternal, "Copia Interna de Factura");
                    }, 500); // Small delay to allow print dialog to reset
                });

                showModal(modals.invoicePreview, invoiceTextForModal, saleId); // Show the appropriate content in the modal
            } else {
                console.warn(
                    "Could not fetch saved sale document for invoice preview:",
                    saleId
                );
                showAlert(
                    "Venta procesada, pero no se pudo generar la previsualización de la factura.",
                    "warning"
                );
            }

            resetSaleAfterCompletion();

            loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect?.value);
            updateLowStockCount();

        } catch (error) {
            console.error("Error procesando venta:", error);
            if (
                error.message.includes("Stock insuficiente") ||
                error.message.includes("Product not found")
            ) {} else if (error.code === "permission-denied") {
                showAlert(
                    "Error de permisos al registrar la venta o actualizar inventario. Revisa tus Security Rules.",
                    "error"
                );
            } else {
                showAlert(
                    "Error al procesar la venta. Intenta de nuevo o contacta al administrador. (Ver consola para detalles)",
                    "error"
                );
            }
        } finally {
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.disabled = false;
                cartUI.processSaleButton.style.opacity = 1;
            }
            updateChangeDisplay(total);
        }
    };

    /**
     * Helper function to handle printing specific content.
     * @param {string} contentHtml - The HTML string to print.
     * @param {string} windowTitle - The title for the print window.
     * @param {function} [callback] - Optional callback to run after printing.
     */
    const printInvoiceContent = (contentHtml, windowTitle, callback) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            showAlert("Permite ventanas emergentes para imprimir.", "warning");
            return;
        }

        printWindow.document.write("<html><head><title>" + windowTitle + "</title>");
        printWindow.document.write("<style>");
        printWindow.document.write(`
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 0; }
            .invoice-logo-print {
                display: block;
                margin: 5mm auto;
                max-width: 20mm;
                height: auto;
                filter: grayscale(100%);
                -webkit-filter: grayscale(100%);
            }
            #invoice-content {
                white-space: pre-wrap;
                word-break: break-word;
                line-height: 1.4;
                width: 80mm;
                margin: 0 auto;
                padding: 0 5mm 10mm 5mm;
                text-align: center;
            }
            body, #invoice-content {
                color: #000 !important;
                background-color: #fff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            /* Add any other specific print styles here if needed */
        `);
        printWindow.document.write("</style></head><body>");
        printWindow.document.write(`<img src="${BUSINESS_LOGO_URL}" class="invoice-logo-print" alt="Logo Negocio">`);
        printWindow.document.write(`<pre id="invoice-content">${contentHtml}</pre>`);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.focus();

        printWindow.onload = function() {
            printWindow.print();
            printWindow.onafterprint = function() {
                printWindow.close();
                if (callback) callback();
            };
        };
    };


    const resetSaleAfterCompletion = () => {
        cart = [];
        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();

        if (cartUI.amountReceivedInput) cartUI.amountReceivedInput.value = "";
        if (cartUI.paymentMethodSelect)
            cartUI.paymentMethodSelect.value = "efectivo";
        if (cartUI.appliedDiscountDisplay) cartUI.appliedDiscountDisplay.classList.add('hidden');

        updateChangeDisplay(0);

        if (cartUI.saleVerse) {
            setTimeout(() => {
                cartUI.saleVerse.classList.add("hidden");
            }, 5000);
        }
    };

    const handlePrintInvoice = () => {
        // Only admins can print invoices (the button is admin-only)
        if (!currentUser || currentUser.role !== "admin") {
            showAlert(
                "Acceso restringido. Solo administradores pueden imprimir facturas.",
                "warning"
            );
            return;
        }

        if (!currentInvoiceId) {
            console.error("Cannot print invoice: currentInvoiceId is missing.");
            showAlert("Error al imprimir: No se pudo obtener la información de la factura.", "error");
            return;
        }

        console.log("Preparing invoice for printing...");

        // Fetch sale data for printing to ensure latest info
        db.collection('sales').doc(currentInvoiceId).get().then(saleDoc => {
            if (saleDoc.exists) {
                const saleData = {
                    id: saleDoc.id,
                    ...saleDoc.data()
                };
                const invoiceTextCustomer = generateInvoiceHTML(saleData, true, false); // Customer copy
                let invoiceTextInternal = generateInvoiceHTML(saleData, false, true); // Internal copy (with profit/cost, forAdminReport=true)

                // Add "COPIA PARA EL VENDEDOR" label to internal copy
                const label = "\n\n        ****** COPIA PARA EL VENDEDOR ******\n\n";
                const lastLineIndex = invoiceTextInternal.lastIndexOf("----------------------------------");
                if (lastLineIndex !== -1) {
                    invoiceTextInternal = invoiceTextInternal.substring(0, lastLineIndex) + label + invoiceTextInternal.substring(lastLineIndex);
                } else {
                    invoiceTextInternal += label;
                }

                // First print the customer copy
                printInvoiceContent(invoiceTextCustomer, "Factura de Cliente", () => {
                    // Then print the internal copy with delay
                    setTimeout(() => {
                        printInvoiceContent(invoiceTextInternal, "Copia Interna de Factura");
                    }, 500); // Small delay to allow print dialog to reset
                });

            } else {
                console.error("Cannot print invoice: Sale document not found for ID", currentInvoiceId);
                showAlert("Error al imprimir: No se encontraron los datos de la factura.", "error");
            }
        }).catch(error => {
            console.error("Error fetching sale data for printing:", error);
            showAlert("Error al imprimir: Falló la carga de datos.", "error");
        });
    };


    const handleDeleteInvoice = () => {
        // This action is strictly ADMIN-ONLY. The button is admin-only.
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido. Solo administradores pueden eliminar facturas.", "warning");
            return;
        }
        if (!currentInvoiceId) {
            console.error(
                "Attempted to delete invoice, but no currentInvoiceId is set."
            );
            showAlert(
                "Error: No se pudo identificar la factura a eliminar.",
                "error"
            );
            return;
        }
        if (!modals.confirmAction?.element) {
            console.error("Confirm modal not found.");
            return;
        }

        showModal(
            modals.confirmAction,
            "Confirmar Eliminación de Factura",
            `¿Estás seguro de que quieres eliminar la factura #${currentInvoiceId.substring(
        0,
        6
      )}...? Esta acción no se puede deshacer y NO restaura el stock de los productos vendidos.`,
            async () => {
                if (!db) {
                    showAlert("Base de datos no disponible.", "error");
                    return;
                }
                console.log("Deleting invoice:", currentInvoiceId);
                modals.invoicePreview?.deleteButton?.setAttribute("disabled", "true");
                modals.confirmAction?.yesButton?.setAttribute("disabled", "true");

                try {
                    await db.collection("sales").doc(currentInvoiceId).delete();
                    showAlert(
                        `Factura #${currentInvoiceId.substring(
              0,
              6
            )}... eliminada con éxito.`,
                        "success"
                    );
                    hideAllModals();

                    if (cuadreCajaUI.section?.classList.contains("active")) {
                        if (
                            cuadreCajaUI.reportStartDate?.value &&
                            cuadreCajaUI.reportEndDate?.value
                        ) {
                            generateCashReport();
                        } else {
                            if (cuadreCajaUI.reportDetailsContainer) {
                                cuadreCajaUI.reportDetailsContainer.innerHTML =
                                    '<p class="placeholder-text">Factura eliminada. Selecciona un rango de fechas para generar el reporte o busca otra factura.</p>';
                            }
                        }
                        if (cuadreCajaUI.searchInvoiceInput)
                            cuadreCajaUI.searchInvoiceInput.value = "";
                    }
                } catch (error) {
                    console.error("Error eliminando factura:", error);
                    if (error.code === "permission-denied") {
                        showAlert(
                            "Error de permisos al eliminar factura. Revisa tus Security Rules.",
                            "error"
                        );
                    } else {
                        showAlert("Error al eliminar la factura.", "error");
                    }
                } finally {
                    modals.invoicePreview?.deleteButton?.removeAttribute("disabled");
                    modals.confirmAction?.yesButton?.removeAttribute("disabled");
                }
            }
        );
    };

    const handleModifyInvoice = () => {
        // This action can be performed by collaborators AFTER admin code verification
        if (!currentInvoiceId) {
            console.error("Attempted to modify invoice, but no currentInvoiceId is set.");
            showAlert("Error: No se pudo identificar la factura a modificar.", "error");
            return;
        }

        // Logic to show admin code modal for collaborators, otherwise proceed for admins
        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'modificar factura', () => simulateModifyInvoice(currentInvoiceId));
        } else {
            simulateModifyInvoice(currentInvoiceId);
        }
    };

    /**
     * Simulates invoice modification by generating a new invoice HTML
     * with a "MODIFICADO" label and re-displaying it in the modal.
     * Does NOT modify the original sale in Firestore.
     * @param {string} invoiceId The ID of the invoice to "modify".
     */
    const simulateModifyInvoice = async (invoiceId) => {
        showAlert(
            "La función 'Modificar Factura' es SIMULADA. La modificación de una venta registrada directamente en la base de datos es compleja y NO se implementa en esta versión por motivos de integridad de datos (stock, reportes). Para corregir errores de cobro, se sugiere eliminar la factura (si es posible) y crear una nueva, o implementar un proceso de ajuste de inventario y/o un registro de notas/correcciones.",
            "info", 8000
        );

        // Fetch the original sale data to generate the "modified" version
        try {
            const saleDoc = await db.collection('sales').doc(invoiceId).get();
            if (saleDoc.exists) {
                const originalSaleData = { id: saleDoc.id, ...saleDoc.data() };
                const isAdmin = currentUser && currentUser.role === "admin";
                let modifiedInvoiceText = generateInvoiceHTML(originalSaleData, !isAdmin, isAdmin); // Show internal copy for admin

                // Add a "MODIFIED" label to the invoice text
                const modifiedLabel = "\n\n        ****** FACTURA MODIFICADA (SIMULADO) ******\n\n";
                const lastLineIndex = modifiedInvoiceText.lastIndexOf("----------------------------------");
                if (lastLineIndex !== -1) {
                    modifiedInvoiceText = modifiedInvoiceText.substring(0, lastLineIndex) + modifiedLabel + modifiedInvoiceText.substring(lastLineIndex);
                } else {
                    modifiedInvoiceText += modifiedLabel;
                }

                // Update the invoice preview modal with the "modified" content
                if (modals.invoicePreview.content) {
                    modals.invoicePreview.content.innerHTML = modifiedInvoiceText;
                }
                showToast(`Factura ${invoiceId.substring(0,6)}... marcada como 'Modificada'.`, "info");

            } else {
                showAlert("No se pudo cargar la factura original para simular la modificación.", "error");
            }
        } catch (error) {
            console.error("Error simulando modificación de factura:", error);
            showAlert("Error al simular la modificación de la factura.", "error");
        }
    };


    const renderInventoryTable = (itemsToRender) => {
        const listContainer = inventarioUI.listContainer;
        if (!listContainer) {
            console.error("Inventory list container not found for rendering.");
            return;
        }

        listContainer.innerHTML = "";
        if (itemsToRender.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">No hay productos en el inventario.</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.role === 'admin';

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th data-label="Código">Código</th>
                    <th data-label="Nombre">Nombre</th>
                    <th data-label="Categoría">Categoría</th>
                    <th data-label="Precio Venta">Precio Venta</th>
                    ${isAdmin ? '<th data-label="Costo">Costo</th>' : ''} <!-- Hidden for collaborators -->
                    ${isAdmin ? '<th data-label="Margen">Margen %</th>' : ''} <!-- Hidden for collaborators -->
                    <th data-label="Stock">Stock</th>
                    <th data-label="Acciones">Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        itemsToRender.forEach(item => {
            const tr = tbody.insertRow();
            const stock = item.stock ?? 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD;

            let stockDisplay = stock;
            if (isOutOfStock) stockDisplay = `Agotado (${stock})`;
            else if (isLowStock) stockDisplay = `Bajo (${stock})`;

            if (isOutOfStock) {
                tr.classList.add('out-of-stock');
            } else if (isLowStock) {
                tr.classList.add('low-stock');
            }

            const price = item.price ?? 0;
            const cost = item.costPrice ?? 0;
            const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : 0; // Calculate margin

            tr.innerHTML = `
                <td data-label="Código">${item.code || 'N/A'}</td>
                <td data-label="Nombre">${item.name || 'Sin Nombre'}</td>
                <td data-label="Categoría">${item.category || 'N/A'}</td>
                <td data-label="Precio Venta">${formatPrice(price)}</td>
                ${isAdmin ? `<td data-label="Costo">${formatPrice(cost)}</td>` : ''}
                ${isAdmin ? `<td data-label="Margen">${margin}%</td>` : ''}
                <td data-label="Stock">${stockDisplay}</td>
                <td class="table-actions">
                    <button class="button-secondary small edit-product-button" data-id="${item.id}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-edit"></i> Editar</button>
                    <button class="button-danger small delete-product-button" data-id="${item.id}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;

            const editButton = tr.querySelector('.edit-product-button');
            if (editButton) {
                // Edit product is admin-only, but the button is always present, so we still gate it
                editButton.addEventListener('click', () => {
                    showModal(modals.adminCode, 'editar producto', () => showModal(modals.product, 'edit', item));
                });
            }
            const deleteButton = tr.querySelector('.delete-product-button');
            if (deleteButton) {
                // Delete product is admin-only
                deleteButton.addEventListener('click', () => {
                    showModal(modals.adminCode, 'eliminar producto', () => confirmDeleteProduct(item));
                });
            }
        });

        listContainer.appendChild(table);
    };


    const loadInventoryFromFirestore = async () => {
        const listContainer = inventarioUI.listContainer;
        if (!db || !listContainer) {
            if (listContainer)
                listContainer.innerHTML =
                '<p class="placeholder-text" style="color:red;">Base de datos no disponible.</p>';
            console.error("DB or Inventory list container not initialized.");
            return;
        }
        // Collaborators can view inventory, no check needed here.

        listContainer.innerHTML =
            '<p class="placeholder-text">Cargando inventario...</p>';
        try {
            console.log("Fetching inventory products from Firestore...");
            const snapshot = await db.collection("products").orderBy("name").get();
            productsCache = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Fetched ${productsCache.length} inventory products.`);

            updateLowStockCount();

            renderInventoryTable(productsCache);
            populateProductSelectForInventoryMovements();
            renderRecentInventoryMovements();
        } catch (error) {
            console.error("Error cargando inventario:", error);
            if (listContainer) {
                if (error.code === "permission-denied") {
                    listContainer.innerHTML =
                        '<p class="placeholder-text" style="color:red;">Acceso denegado. Revisa tus permisos (Security Rules).</p>';
                } else {
                    listContainer.innerHTML =
                        '<p class="placeholder-text" style="color:red;">Error al cargar inventario.</p>';
                    showAlert("No se pudo cargar el inventario.", "error");
                }
            }
            productsCache = [];
            updateLowStockCount();
        }
    };

    const handleSaveProduct = async () => {
        // This action is strictly ADMIN-ONLY. The modal only shows if admin.
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }
        if (!db) {
            showAlert("Base de datos no disponible.", "error");
            return;
        }
        const modal = modals.product;
        if (
            !modal?.element ||
            !modal.nameInput ||
            !modal.codeInput ||
            !modal.priceInput ||
            !modal.costInput || // NEW
            !modal.stockInput ||
            !modal.categoryInput ||
            !modal.saveButton
        ) {
            console.error("Product modal elements not found.");
            return;
        }

        const name = modal.nameInput.value.trim();
        const code = modal.codeInput.value.trim();
        const price = parseFloat(modal.priceInput.value);
        const costPrice = parseFloat(modal.costInput.value); // NEW
        const stock = parseInt(modal.stockInput.value, 10);
        const category = modal.categoryInput.value.trim();

        if (
            !name || !code || isNaN(price) || price < 0 || isNaN(costPrice) || costPrice < 0 || isNaN(stock) || stock < 0 || !category // NEW: Validate costPrice
        ) {
            showAlert(
                "Por favor, completa todos los campos correctamente (Nombre, Código, Precio Venta >= 0, Costo >= 0, Stock >= 0, Categoría).", // NEW: Update message
                "error"
            );
            if (!name) modal.nameInput.focus();
            else if (!code) modal.codeInput.focus();
            else if (isNaN(price) || price < 0) modal.priceInput.focus();
            else if (isNaN(costPrice) || costPrice < 0) modal.costInput.focus(); // NEW
            else if (isNaN(stock) || stock < 0) modal.stockInput.focus();
            else if (!category) modal.categoryInput.focus();
            return;
        }

        const productData = {
            name,
            code: code.toUpperCase(),
            price,
            costPrice, // NEW: Include costPrice
            stock,
            category
        };
        productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        modal.saveButton.disabled = true;
        modal.saveButton.textContent = editingProductId ?
            "Actualizando..." :
            "Guardando...";

        try {
            if (editingProductId) {
                await db
                    .collection("products")
                    .doc(editingProductId)
                    .update(productData);
                showAlert("Producto actualizado con éxito.", "success");
            } else {
                if (productsCache.length === 0) {
                    console.warn(
                        "Products cache is empty during duplicate code check. Attempting to fetch."
                    );
                    await loadProductsFromFirestore();
                }
                const existingProduct = productsCache.find(
                    (p) => p.code?.toUpperCase() === code.toUpperCase()
                );
                if (existingProduct) {
                    showAlert(
                        `Ya existe un producto con el código "${code.toUpperCase()}".`,
                        "warning"
                    );
                    modal.saveButton.disabled = false;
                    modal.saveButton.textContent = "Guardar";
                    modal.codeInput.focus();
                    return;
                }
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("products").add(productData);
                showAlert("Producto añadido con éxito.", "success");
            }
            hideAllModals();
            loadInventoryFromFirestore();
            if (
                document.getElementById("ventas-section")?.classList.contains("active") &&
                ventasUI.productSearchInput
            ) {
                loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value);
            }
            updateLowStockCount();
        } catch (error) {
            console.error("Error guardando producto:", error);
            if (error.code === "permission-denied") {
                showAlert(
                    "Error de permisos al guardar/actualizar producto. Revisa tus Security Rules.",
                    "error"
                );
            } else {
                showAlert("Error al guardar el producto.", "error");
            }
        } finally {
            if (modal.saveButton) {
                modal.saveButton.disabled = false;
                modal.saveButton.textContent = editingProductId ?
                    "Actualizar" :
                    "Guardar";
            }
        }
    };

    const confirmDeleteProduct = (product) => {
        // This action is strictly ADMIN-ONLY.
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }
        if (!modals.confirmAction?.element) {
            console.error("Confirm modal not found.");
            return;
        }
        if (!product || !product.id) {
            console.error("Attempted to delete product with missing ID:", product);
            showAlert("Error: Información del producto incompleta.", "error");
            return;
        }

        showModal(
            modals.confirmAction,
            "Confirmar Eliminación",
            `¿Estás seguro de que quieres eliminar el producto "${
        product.name || "Producto"
      }"? Esta acción no se puede deshacer.`,
            async () => {
                if (!db) {
                    showAlert("Base de datos no disponible.", "error");
                    return;
                }
                try {
                    await db.collection("products").doc(product.id).delete();
                    showAlert("Producto eliminado con éxito.", "success");
                    loadInventoryFromFirestore();
                    if (
                        document
                            .getElementById("ventas-section")
                            ?.classList.contains("active") &&
                        ventasUI.productSearchInput
                    ) {
                        loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value);
                    }
                    updateLowStockCount();
                } catch (error) {
                    console.error("Error eliminando producto:", error);
                    if (error.code === "permission-denied") {
                        showAlert(
                            "Error de permisos al eliminar producto. Revisa tus Security Rules.",
                            "error"
                        );
                    } else {
                        showAlert("Error al eliminar el producto.", "error");
                    }
                }
            }
        );
    };

    // --- User Management Logic (using Firestore 'users' collection) ---

    const renderUsersTable = (usersToRender) => {
        const listContainer = usuariosUI.listContainer;
        if (!listContainer) {
            console.error("User list container not found for rendering.");
            return;
        }

        listContainer.innerHTML = "";
        if (usersToRender.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">No hay usuarios registrados en la base de datos.</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.role === 'admin';

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th data-label="Nombre">Nombre</th>
                    <th data-label="Nombre de Usuario">Nombre de Usuario</th>
                    <th data-label="Email (UID)">Email (UID)</th>
                    <th data-label="Rol">Rol</th>
                    <th data-label="Cuenta Equipo">Cuenta Equipo</th> <!-- NEW -->
                    <th data-label="Comisión General ($)">Comisión General ($)</th>
                    <th data-label="Comisión Hotdog ($)">Comisión Hotdog ($)</th>
                    <th data-label="Acciones">Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        usersToRender.forEach(user => {
            const tr = tbody.insertRow();
            const userRole = user.role || 'colaborator';
            const generalCommissionDisplay = user.generalCommissionEnabled ? `${formatPrice(user.generalCommissionAmount ?? 0)}/venta` : 'N/A'; // Renamed properties
            const hotdogCommissionDisplay = user.hotdogCommissionEnabled ? `${formatPrice(user.hotdogCommissionPerItem ?? 0)}/hotdog` : 'N/A'; // NEW
            const isTeamAccountDisplay = user.isTeamAccount ? 'Sí' : 'No'; // NEW
            

            tr.innerHTML = `
                <td data-label="Nombre">${user.name || 'Sin Nombre'}</td>
                <td data-label="Nombre de Usuario">${user.username || 'N/A'}</td>
                <td data-label="Email (UID)">${user.email || 'N/A'} <small>(ID: ${user.uid ? user.uid.substring(0, 6) + '...' : 'N/A'})</small></td>
                <td data-label="Rol">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</td>
                <td data-label="Cuenta Equipo">${isTeamAccountDisplay}</td> <!-- NEW -->
                <td data-label="Comisión General ($)">${generalCommissionDisplay}</td>
                <td data-label="Comisión Hotdog ($)">${hotdogCommissionDisplay}</td> <!-- NEW -->
                <td class="table-actions">
                    <button class="button-secondary small edit-user-button" data-id="${user.uid}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-edit"></i> Editar</button>
                    <button class="button-danger small delete-user-button" data-id="${user.uid}" ${isAdmin && user.uid !== currentUser.uid ? '' : 'disabled'}><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;

            const editButton = tr.querySelector('.edit-user-button');
            if (editButton) {
                editButton.addEventListener('click', () => {
                    // Only admins can edit user data
                    showModal(modals.adminCode, 'editar usuario', () => showModal(modals.user, 'edit', user));
                });
            }
            const deleteButton = tr.querySelector('.delete-user-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    // Only admins can delete user data
                    showModal(modals.adminCode, 'eliminar usuario', () => confirmDeleteUser(user));
                });
            }
        });

        listContainer.appendChild(table);
    };


    const loadUsersForManagement = async () => {
        const listContainer = usuariosUI.listContainer;
        if (!db || !listContainer) {
            if (listContainer) listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Base de datos no disponible.</p>';
            console.error("DB or User list container not initialized.");
            return;
        }
        // This section is strictly ADMIN-ONLY, UI visibility handled by updateUIVisibilityBasedOnRole
        if (!currentUser || currentUser.role !== 'admin') {
            listContainer.innerHTML = '<p class="placeholder-text">Acceso restringido. Solo administradores pueden ver los usuarios.</p>';
            return;
        }

        listContainer.innerHTML = '<p class="placeholder-text">Cargando usuarios...</p>';
        try {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            renderUsersTable(users);
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            if (listContainer) {
                if (error.code === 'permission-denied') {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado. Revisa tus permisos (Security Rules).</p>';
                } else {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar usuarios.</p>';
                    showAlert('No se pudieron cargar los usuarios.', "error");
                }
            }
        }
    };

    const handleSaveUser = async () => {
        // This action is strictly ADMIN-ONLY.
        if (!currentUser || currentUser.role !== 'admin') {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!db) {
            showAlert('Base de datos no disponible.', "error");
            return;
        }
        const modal = modals.user;
        if (!modal?.element || !modal.nameInput || !modal.usernameInput || !modal.emailInput || !modal.idInput || !modal.roleSelect || // NEW: Add emailInput check
            !modal.generalCommissionEnabledCheckbox || !modal.generalCommissionAmountInput || // Renamed IDs
            !modal.hotdogCommissionEnabledCheckbox || !modal.hotdogCommissionPerItemInput || // NEW IDs
            !modal.isTeamAccountCheckbox || // NEW
            !modal.saveButton) {
            console.error("User modal elements not fully found for save.");
            return;
        }

        const name = modal.nameInput.value.trim();
        const username = modal.usernameInput.value.trim();
        const email = modal.emailInput.value.trim(); // NEW: Get email value (though it's disabled)
        const uid = modal.idInput.value.trim();
        const role = modal.roleSelect.value;

        const generalCommissionEnabled = modal.generalCommissionEnabledCheckbox.checked; // Renamed ID
        const generalCommissionAmount = generalCommissionEnabled ? parseFloat(modal.generalCommissionAmountInput.value) : 0; // Renamed ID

        const hotdogCommissionEnabled = modal.hotdogCommissionEnabledCheckbox.checked; // NEW
        const hotdogCommissionPerItem = hotdogCommissionEnabled ? parseFloat(modal.hotdogCommissionPerItemInput.value) : 0; // NEW
        const isTeamAccount = modal.isTeamAccountCheckbox.checked; // NEW


        if (!name || !username || !uid || !email) { // NEW: Validate email presence
            showAlert('Por favor, ingresa el nombre, nombre de usuario, email y el UID del usuario.', "warning"); // NEW: Update message
            if (!name) modal.nameInput.focus();
            else if (!username) modal.usernameInput.focus();
            else if (!email) modal.emailInput.focus(); // NEW
            else modal.idInput.focus();
            return;
        }
        if (generalCommissionEnabled && (isNaN(generalCommissionAmount) || generalCommissionAmount < 0)) { // Renamed
            showAlert('El monto de la comisión general debe ser un número válido (>= 0).', "warning");
            modal.generalCommissionAmountInput.focus(); // Renamed
            return;
        }
        if (hotdogCommissionEnabled && (isNaN(hotdogCommissionPerItem) || hotdogCommissionPerItem < 0)) { // NEW
            showAlert('El monto de la comisión por hotdog debe ser un número válido (>= 0).', "warning");
            modal.hotdogCommissionPerItemInput.focus(); // NEW
            return;
        }

        const userData = {
            name: name,
            username: username,
            email: email, // NEW: Include email in metadata
            role: role,
            generalCommissionEnabled: generalCommissionEnabled, // Renamed
            generalCommissionAmount: generalCommissionAmount, // Renamed
            hotdogCommissionEnabled: hotdogCommissionEnabled, // NEW
            hotdogCommissionPerItem: hotdogCommissionPerItem, // NEW
            isTeamAccount: isTeamAccount, // NEW
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        modal.saveButton.disabled = true;
        modal.saveButton.textContent = editingUserId ? 'Actualizando...' : 'Guardando...';

        try {
            const userDocRef = db.collection('users').doc(uid);
            const userDoc = await userDocRef.get();

            if (editingUserId) {
                // Si estamos editando y el nombre de usuario ha cambiado, verificar duplicados
                if (userDoc.exists && userDoc.data().username !== username) {
                    const existingUsernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
                    if (!existingUsernameQuery.empty && existingUsernameQuery.docs[0].id !== uid) { // Exclude current user from duplicate check
                        showAlert(`Ya existe otro usuario con el nombre de usuario "${username}". Por favor, elige otro.`, "warning");
                        modal.saveButton.disabled = false;
                        modal.saveButton.textContent = 'Actualizar';
                        modal.usernameInput.focus();
                        return;
                    }
                }
                if (!userDoc.exists) {
                    showAlert(`Error: El usuario con UID ${uid} no existe en la base de datos de metadatos.`, "error");
                    return;
                }
                await userDocRef.update(userData);
                showAlert('Metadatos de usuario actualizados con éxito.', "success");
            } else {
                // Si estamos añadiendo un nuevo usuario, siempre verificar duplicados
                const existingUsernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
                if (!existingUsernameQuery.empty) {
                    showAlert(`Ya existe un usuario con el nombre de usuario "${username}". Por favor, elige otro.`, "warning");
                    modal.saveButton.disabled = false;
                    modal.saveButton.textContent = 'Guardar';
                    modal.usernameInput.focus();
                    return;
                }
                if (userDoc.exists) {
                    showAlert(`Ya existen metadatos para este UID (${uid}). Si deseas editarlos, usa la opción de edición.`, "warning");
                    return;
                }
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("users").doc(uid).set(userData); // Use .set(userData) instead of .add(userData) when UID is specified
                showAlert('Metadatos de usuario añadidos con éxito.', "success");
            }

            hideAllModals();
            loadUsersForManagement();
            if (currentUser && currentUser.uid === uid) {
                currentUser.name = name;
                currentUser.username = username;
                currentUser.email = email; // NEW: Update current user's email if it's their own profile
                currentUser.role = role;
                currentUser.generalCommissionEnabled = generalCommissionEnabled; // Renamed
                currentUser.generalCommissionAmount = generalCommissionAmount; // Renamed
                currentUser.hotdogCommissionEnabled = hotdogCommissionEnabled; // NEW
                currentUser.hotdogCommissionPerItem = hotdogCommissionPerItem; // NEW
                currentUser.isTeamAccount = isTeamAccount; // NEW
                // Esto hará que el nombre de usuario en la barra superior se actualice automáticamente
                mainAppUI.currentUserDisplay.name.textContent = currentUser.username || currentUser.name || currentUser.email || "Usuario";
                updateUIVisibilityBasedOnRole();
                // NEW: Update visibility of team members button based on current user's isTeamAccount flag
                if (mainAppUI.setTeamMembersButton) {
                    mainAppUI.setTeamMembersButton.classList.toggle('hidden', !currentUser.isTeamAccount);
                }
            }
        } catch (error) {
            console.error("Error guardando usuario:", error);
            if (error.code === 'permission-denied') {
                showAlert('Error de permisos al guardar/actualizar usuario. Revisa tus Security Rules.', "error");
            } else {
                showAlert('Error al guardar el usuario. Asegúrate de que el UID de Firebase Auth sea correcto.', "error");
            }
        } finally {
            modal.saveButton.disabled = false;
            modal.saveButton.textContent = editingUserId ? 'Actualizar' : 'Guardar';
        }
    };

    const confirmDeleteUser = (userToDelete) => {
        // This action is strictly ADMIN-ONLY.
        if (!currentUser || currentUser.role !== "admin") {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!modals.confirmAction?.element) {
            console.error("Confirm modal not found.");
            return;
        }
        if (!userToDelete || !userToDelete.uid) {
            console.error("Attempted to delete user with missing UID:", userToDelete);
            showAlert("Error: Información de usuario incompleta.", "error");
            return;
        }

        if (userToDelete.uid === currentUser.uid) {
            showAlert("No puedes eliminar tu propio usuario de administrador.", "warning");
            return;
        }

        showModal(modals.confirmAction,
            'Confirmar Eliminación de Usuario',
            `¿Estás seguro de que quieres eliminar el usuario "${userToDelete.name || userToDelete.email}"? Esta acción eliminará los metadatos del usuario de la base de datos, pero NO eliminará la cuenta de autenticación de Firebase. Deberás eliminar la cuenta de autenticación manualmente en la consola de Firebase if necessary.`,
            async () => {
                if (!db) {
                    showAlert("Base de datos no disponible.", "error");
                    return;
                }
                try {
                    await db.collection('users').doc(userToDelete.uid).delete();
                    showAlert('Metadatos de usuario eliminados con éxito.', "success");
                    loadUsersForManagement();
                } catch (error) {
                    console.error('Error eliminando usuario:', error);
                    if (error.code === 'permission-denied') {
                        showAlert('Error de permisos al eliminar usuario. Revisa tus Security Rules.', "error");
                    } else {
                        showAlert('Error al eliminar el usuario.', "error");
                    }
                }
            }
        );
    };

    const renderRecentCashMovements = async () => {
        const container = salidaEntradaUI.cashMovementsHistoryContainer;
        if (!db || !currentUser || !container) { // Removed role check, collaborators can see this
            if (container)
                container.innerHTML =
                '<p class="placeholder-text">Acceso restringido.</p>';
            return;
        }

        container.innerHTML = '<p class="placeholder-text">Cargando movimientos recientes...</p>';

        const today = new Date();
        const {
            start: startTimestamp,
            end: endTimestamp
        } = getBusinessDateRange(today.toISOString().split('T')[0], today.toISOString().split('T')[0]);


        try {
            const snapshot = await db
                .collection("cashMovements")
                .where("timestamp", ">=", startTimestamp)
                .where("timestamp", "<=", endTimestamp)
                .orderBy("timestamp", "desc")
                .limit(10)
                .get();

            const movements = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            container.innerHTML = "";

            if (movements.length === 0) {
                container.innerHTML =
                    '<p class="placeholder-text">No se han registrado movimientos de caja hoy. El reporte completo está en "Cuadre Caja".</p>';
                return;
            }

            const isAdmin = currentUser && currentUser.role === "admin";

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th data-label="Tipo">Tipo</th>
                        <th data-label="Fecha/Hora">Fecha/Hora</th>
                        <th data-label="Descripción">Descripción</th>
                        <th data-label="Monto">Monto</th>
                        ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''} <!-- Hidden for collaborators -->
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));

            movements.forEach((move) => {
                const moveDate = move.timestamp && typeof move.timestamp.toDate === "function" ?
                    move.timestamp.toDate().toLocaleString("es-DO") :
                    "N/A";
                const recordedBy = usersMetadata.find(u => u.uid === move.recordedBy?.id);
                const recordedByName = recordedBy?.username || recordedBy?.name || move.recordedBy?.name || "Desconocido";
                const amountDisplay = formatPrice(move.amount ?? 0);
                const typeDisplay = move.type === 'addition' ? 'Entrada' : 'Salida';
                const amountColor = move.type === 'addition' ? 'var(--bg-success)' : 'var(--bg-danger)';

                const tr = tbody.insertRow();
                tr.innerHTML = `
                    <td data-label="Tipo">${typeDisplay}</td>
                    <td data-label="Fecha/Hora">${moveDate}</td>
                    <td data-label="Descripción">${move.description || "Sin descripción"}</td>
                    <td data-label="Monto"><strong style="color: ${amountColor};">${amountDisplay}</strong></td>
                    ${isAdmin ? `<td data-label="Registrado Por">${recordedByName}</td>` : ''}
                `;
            });
            container.appendChild(table);
            container.insertAdjacentHTML('beforeend', '<p class="placeholder-text" style="margin-top: 10px;">El reporte completo de movimientos está en "Cuadre Caja".</p>');

        } catch (error) {
            console.error("Error loading recent cash movements:", error);
            if (container) {
                if (error.code === "permission-denied") {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado para cargar movimientos recientes.</p>';
                } else {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar movimientos recientes.</p>';
                    showAlert("No se pudieron cargar los movimientos de caja recientes.", "error");
                }
            }
        }
    };

    const populateProductSelectForInventoryMovements = () => {
        const selectElement = modals.inventoryMovement.productSelect;
        if (!selectElement) return;

        selectElement.innerHTML = '<option value="">Selecciona un producto</option>';
        if (productsCache.length > 0) {
            productsCache.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Stock: ${product.stock})`;
                selectElement.appendChild(option);
            });
        }
    };

    const handleRecordInventoryMovement = async () => {
        // Collaborators can record inventory movement after admin code verification
        if (!db || !modals.inventoryMovement.productSelect || !modals.inventoryMovement.typeSelect || !modals.inventoryMovement.quantityInput || !modals.inventoryMovement.descriptionInput || !modals.inventoryMovement.saveButton) {
            showToast('La aplicación no está completamente cargada. Intenta recargar.', "error");
            return;
        }

        const productId = modals.inventoryMovement.productSelect.value;
        const type = modals.inventoryMovement.typeSelect.value;
        const quantity = parseInt(modals.inventoryMovement.quantityInput.value, 10);
        const description = modals.inventoryMovement.descriptionInput.value.trim();

        if (!productId) {
            showToast('Por favor, selecciona un Producto para el movimiento de inventario.', "warning");
            modals.inventoryMovement.productSelect.focus();
            return;
        }
        if (isNaN(quantity) || quantity <= 0) {
            showToast('Por favor, ingresa una Cantidad válida (un número mayor que 0).', "warning");
            modals.inventoryMovement.quantityInput.focus();
            return;
        }
        if (!description) {
            showToast('Por favor, ingresa una Descripción para el movimiento.', "warning");
            modals.inventoryMovement.descriptionInput.focus();
            return;
        }

        const productInCache = productsCache.find(p => p.id === productId);
        if (!productInCache) {
            showToast('Producto no encontrado en el inventario. Por favor, recarga la página.', "error");
            return;
        }

        if (type.startsWith('out') && quantity > productInCache.stock) {
            showToast(`No hay suficiente stock para "${productInCache.name}". Stock disponible: ${productInCache.stock}`, "warning");
            return;
        }

        modals.inventoryMovement.saveButton.disabled = true;
        modals.inventoryMovement.saveButton.textContent = 'Registrando...';

        const movementData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            productId: productId,
            productName: productInCache.name,
            type: type,
            quantity: quantity,
            description: description,
            recordedBy: {
                id: currentUser.uid,
                name: currentUser.username || currentUser.name || 'Desconocido'
            }
        };

        const batch = db.batch();
        const productRef = db.collection('products').doc(productId);
        const movementRef = db.collection('inventoryMovements').doc();

        batch.set(movementRef, movementData);

        const stockChange = (type === 'in') ? quantity : -quantity;
        batch.update(productRef, {
            stock: firebase.firestore.FieldValue.increment(stockChange)
        });

        try {
            await batch.commit();
            showToast('Movimiento de inventario registrado con éxito.', "success");
            modals.inventoryMovement.productSelect.value = '';
            modals.inventoryMovement.typeSelect.value = 'in';
            modals.inventoryMovement.quantityInput.value = '';
            modals.inventoryMovement.descriptionInput.value = '';
            hideAllModals();

            loadInventoryFromFirestore();
        } catch (error) {
            console.error('Error registrando movimiento de inventario:', error);
            if (error.code === 'permission-denied') {
                showToast('Error de permisos al registrar movimiento. Revisa tus Security Rules.', "error");
            } else {
                showToast('Error al registrar movimiento de inventario. Intenta de nuevo.', "error");
            }
        } finally {
            modals.inventoryMovement.saveButton.disabled = false;
            modals.inventoryMovement.saveButton.textContent = 'Registrar Movimiento';
        }
    };

    const renderRecentInventoryMovements = async () => {
        const container = inventarioUI.inventoryMovementsHistoryContainer;
        if (!db || !currentUser || !container) { // Removed role check, collaborators can see this
            if (container)
                container.innerHTML =
                '<p class="placeholder-text">Acceso restringido.</p>';
            return;
        }

        container.innerHTML = '<p class="placeholder-text">Cargando movimientos recientes de inventario...</p>';

        const today = new Date();
        const {
            start: startTimestamp,
            end: endTimestamp
        } = getBusinessDateRange(today.toISOString().split('T')[0], today.toISOString().split('T')[0]);

        try {
            const snapshot = await db
                .collection("inventoryMovements")
                .where("timestamp", ">=", startTimestamp)
                .where("timestamp", "<=", endTimestamp)
                .orderBy("timestamp", "desc")
                .limit(10)
                .get();

            const movements = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            container.innerHTML = "";

            if (movements.length === 0) {
                container.innerHTML =
                    '<p class="placeholder-text">No se han registrado movimientos de inventario hoy.</p>';
                return;
            }

            const isAdmin = currentUser && currentUser.role === "admin";

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th data-label="Fecha/Hora">Fecha/Hora</th>
                        <th data-label="Producto">Producto</th>
                        <th data-label="Tipo">Tipo</th>
                        <th data-label="Cantidad">Cantidad</th>
                        <th data-label="Descripción">Descripción</th>
                        ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''} <!-- Hidden for collaborators -->
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));

            movements.forEach((move) => {
                const moveDate = move.timestamp && typeof move.timestamp.toDate === "function" ?
                    move.timestamp.toDate().toLocaleString("es-DO") :
                    "N/A";
                const recordedBy = usersMetadata.find(u => u.uid === move.recordedBy?.id);
                const recordedByName = recordedBy?.username || recordedBy?.name || move.recordedBy?.name || "Desconocido";

                let typeDisplay = '';
                let quantityDisplay = '';
                let quantityColor = '';
                if (move.type === 'in') {
                    typeDisplay = 'Entrada';
                    quantityDisplay = `+${move.quantity ?? 0}`;
                    quantityColor = 'var(--bg-success)';
                } else if (move.type === 'out_waste') {
                    typeDisplay = 'Merma/Daño';
                    quantityDisplay = `-${move.quantity ?? 0}`;
                    quantityColor = 'var(--bg-danger)';
                } else if (move.type === 'out_use') {
                    typeDisplay = 'Uso Interno';
                    quantityDisplay = `-${move.quantity ?? 0}`;
                    quantityColor = 'var(--bg-danger)';
                }
                const tr = tbody.insertRow();
                tr.innerHTML = `
                    <td data-label="Fecha/Hora">${moveDate}</td>
                    <td data-label="Producto">${move.productName || "Desconocido"}</td>
                    <td data-label="Tipo">${typeDisplay}</td>
                    <td data-label="Cantidad"><strong>${quantityDisplay}</strong></td>
                    <td data-label="Descripción">${move.description || "Sin descripción"}</td>
                    ${isAdmin ? `<td data-label="Registrado Por">${recordedByName}</td>` : ''}
                `;
            });
            container.appendChild(table);

        } catch (error) {
            console.error("Error loading recent inventory movements:", error);
            if (container) {
                if (error.code === "permission-denied") {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado para cargar movimientos de inventario.</p>';
                } else {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar movimientos de inventario.</p>';
                    showAlert("No se pudieron cargar los movimientos de inventario recientes.", "error");
                }
            }
        }
    };


    const handleRecordPettyCashAddition = async () => {
        // Collaborators can add petty cash after admin code verification
        if (
            !db ||
            !salidaEntradaUI.addPettyCashDescriptionInput ||
            !salidaEntradaUI.addPettyCashAmountInput ||
            !salidaEntradaUI.addPettyCashButton
        ) {
            showAlert(
                "La aplicación no está completamente cargada. Intenta recargar.",
                "error"
            );
            console.error("DB or Cash Addition UI elements (in salidaEntradaUI) not initialized.");
            if (salidaEntradaUI.addPettyCashButton) {
                salidaEntradaUI.addPettyCashButton.disabled = false;
                salidaEntradaUI.addPettyCashButton.textContent = "Agregar Saldo";
            }
            return;
        }

        const description = salidaEntradaUI.addPettyCashDescriptionInput.value.trim();
        const amount = parseFloat(salidaEntradaUI.addPettyCashAmountInput.value);

        if (!description || isNaN(amount) || amount <= 0) {
            showAlert(
                "Por favor, ingresa una descripción y un monto válido (> 0) para la adición.",
                "warning"
            );
            if (!description && salidaEntradaUI.addPettyCashDescriptionInput)
                salidaEntradaUI.addPettyCashDescriptionInput.focus();
            else if (salidaEntradaUI.addPettyCashAmountInput)
                salidaEntradaUI.addPettyCashAmountInput.focus();
            if (salidaEntradaUI.addPettyCashButton) {
                salidaEntradaUI.addPettyCashButton.disabled = false;
                salidaEntradaUI.addPettyCashButton.textContent = "Agregar Saldo";
            }
            return;
        }

        if (salidaEntradaUI.addPettyCashButton) {
            salidaEntradaUI.addPettyCashButton.disabled = true;
            salidaEntradaUI.addPettyCashButton.textContent = "Agregando...";
        }

        const additionData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            description: description,
            amount: amount,
            type: "addition",
            recordedBy: {
                id: currentUser.uid,
                name: currentUser.username || currentUser.name || 'Desconocido'
            }
        };

        try {
            await db.collection("cashMovements").add(additionData);
            showAlert("Saldo añadido a Caja con éxito.", "success");
            if (salidaEntradaUI.addPettyCashDescriptionInput)
                salidaEntradaUI.addPettyCashDescriptionInput.value = "";
            if (salidaEntradaUI.addPettyCashAmountInput)
                salidaEntradaUI.addPettyCashAmountInput.value = "";
            if (salidaEntradaUI.addPettyCashDescriptionInput)
                salidaEntradaUI.addPettyCashDescriptionInput.focus();

            renderRecentCashMovements();

            if (cuadreCajaUI.section?.classList.contains("active")) {
                generateCashReport();
            }

        } catch (error) {
            console.error("Error registrando adición a Caja:", error);
            if (error.code === "permission-denied") {
                showAlert(
                    "Error de permisos al registrar la adición. Revisa tus Security Rules.",
                    "error"
                );
            } else {
                showAlert("Error al registrar la adición de saldo.", "error");
            }
        } finally {
            if (salidaEntradaUI.addPettyCashButton) {
                salidaEntradaUI.addPettyCashButton.disabled = false;
                salidaEntradaUI.addPettyCashButton.textContent = "Agregar Saldo";
            }
        }
    };

    const handleRecordOutput = async () => {
        // Collaborators can record cash output after admin code verification
        if (!db || !salidaEntradaUI.outputDescriptionInput || !salidaEntradaUI.outputAmountInput || !salidaEntradaUI.recordButton) {
            showAlert('La aplicación no está completamente cargada. Intenta recargar.', "error");
            return;
        }

        const description = salidaEntradaUI.outputDescriptionInput.value.trim();
        const amount = parseFloat(salidaEntradaUI.outputAmountInput.value);

        if (!description || isNaN(amount) || amount <= 0) {
            showAlert('Por favor, ingresa una descripción y un monto válido (> 0) para la salida.', "warning");
            if (!description && salidaEntradaUI.outputDescriptionInput) salidaEntradaUI.outputDescriptionInput.focus();
            else if (salidaEntradaUI.outputAmountInput) salidaEntradaUI.outputAmountInput.focus();
            if (salidaEntradaUI.recordButton) {
                salidaEntradaUI.recordButton.disabled = false;
                salidaEntradaUI.recordButton.textContent = "Registrar Salida";
            }
            return;
        }

        if (salidaEntradaUI.recordButton) {
            salidaEntradaUI.recordButton.disabled = true;
            salidaEntradaUI.recordButton.textContent = 'Registrando...';
        }


        const outflowData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            description: description,
            amount: amount,
            type: 'outflow',
            recordedBy: {
                id: currentUser.uid,
                name: currentUser.username || currentUser.name || 'Desconocido'
            }
        };

        try {
            await db.collection('cashMovements').add(outflowData);
            showAlert('Salida de caja registrada con éxito.', "success");
            if (salidaEntradaUI.outputDescriptionInput) salidaEntradaUI.outputDescriptionInput.value = '';
            if (salidaEntradaUI.outputAmountInput) salidaEntradaUI.outputAmountInput.value = '';
            if (salidaEntradaUI.outputDescriptionInput) salidaEntradaUI.outputDescriptionInput.focus();

            renderRecentCashMovements();

            if (cuadreCajaUI.section?.classList.contains("active")) {
                generateCashReport();
            }

        } catch (error) {
            console.error('Error registrando salida de caja:', error);
            if (error.code === 'permission-denied') {
                showAlert('Error de permisos al registrar la salida. Revisa tus Security Rules.', "error");
            } else {
                showAlert('Error al registrar la salida de caja.', "error");
            }
        } finally {
            if (salidaEntradaUI.recordButton) {
                salidaEntradaUI.recordButton.disabled = false;
                salidaEntradaUI.recordButton.textContent = 'Registrar Salida';
            }
        }
    };


    // --- Cash Register Report Logic ---
    /**
     * Generates the cash report and updates the UI.
     */
    const generateCashReport = async () => {
        // Collaborators can generate reports, no check needed here.
        if (
            !db || !cuadreCajaUI.reportStartDate || !cuadreCajaUI.reportEndDate ||
            !cuadreCajaUI.initialPettyCashInput || !cuadreCajaUI.reportDetailsContainer ||
            !cuadreCajaUI.generateReportButton || !cuadreCajaUI.printReportButton
        ) {
            showAlert(
                "La aplicación no está completamente cargada. Intenta recargar.",
                "error"
            );
            console.error("DB or Report UI elements not initialized.");
            return;
        }

        const startDateInput = cuadreCajaUI.reportStartDate.value;
        const endDateInput = cuadreCajaUI.reportEndDate.value;
        const initialPettyCash =
            parseFloat(cuadreCajaUI.initialPettyCashInput.value) || 0;

        if (!startDateInput || !endDateInput) {
            showAlert(
                "Por favor, selecciona un rango de fechas para generar el reporte.",
                "warning"
            );
            if (!startDateInput && cuadreCajaUI.reportStartDate)
                cuadreCajaUI.reportStartDate.focus();
            else if (cuadreCajaUI.reportEndDate) cuadreCajaUI.reportEndDate.focus();
            return;
        }
        if (startDateInput > endDateInput) {
            showAlert(
                "La fecha de inicio no puede ser posterior a la fecha de fin.",
                "warning"
            );
            if (cuadreCajaUI.reportStartDate) cuadreCajaUI.reportStartDate.focus();
            return;
        }

        // Get the business date range based on the selected calendar dates
        const {
            start: queryStartTimestamp,
            end: queryEndTimestamp
        } = getBusinessDateRange(startDateInput, endDateInput);

        console.log(
            "Reporte generado para el rango de negocio (Firestore Query Timestamps):",
            queryStartTimestamp.toDate().toLocaleString(),
            "to",
            queryEndTimestamp.toDate().toLocaleString()
        );

        if (cuadreCajaUI.reportDetailsContainer)
            cuadreCajaUI.reportDetailsContainer.innerHTML =
            '<p class="placeholder-text">Generando reporte...</p>';
        if (cuadreCajaUI.generateReportButton) {
            cuadreCajaUI.generateReportButton.disabled = true;
            cuadreCajaUI.generateReportButton.textContent = "Generando...";
        }
        // Print button visibility is managed at the end of this function based on currentUser.role
        // if (cuadreCajaUI.printReportButton)
        //     cuadreCajaUI.printReportButton.classList.add("hidden");


        try {
            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data()
            }));
            console.log("Users metadata fetched for report:", usersMetadata.length);

            if (productsCache.length === 0) {
                console.log("Products cache empty, loading for report summary...");
                const productsSnapshot = await db.collection("products").get();
                productsCache = productsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(
                    "Products cache loaded for report summary:",
                    productsCache.length
                );
            }

            console.log(
                "Fetching sales using Timestamps >= ",
                queryStartTimestamp,
                "and <= ",
                queryEndTimestamp
            );
            const salesSnapshot = await db
                .collection("sales")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc")
                .get();

            const sales = salesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Sales fetched:", sales.length);

            console.log(
                "Fetching cash movements using Timestamps >= ",
                queryStartTimestamp,
                "and <= ",
                queryEndTimestamp
            );
            const movementsSnapshot = await db
                .collection("cashMovements")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc")
                .get();

            const cashMovements = movementsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            const cashAdditions = cashMovements.filter((m) => m.type === "addition");
            const cashOutflows = cashMovements.filter((m) => m.type === "outflow");

            console.log(
                "Cash movements fetched:",
                cashMovements.length,
                "(Additions:",
                cashAdditions.length,
                ", Outflows:",
                cashOutflows.length,
                ")"
            );

            const inventoryMovementsSnapshot = await db
                .collection("inventoryMovements")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc")
                .get();

            const inventoryMovements = inventoryMovementsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Inventory movements fetched:", inventoryMovements.length);

            let totalSales = 0;
            let totalDiscount = 0;
            let totalCashIn = 0;
            let totalCardIn = 0;
            let totalTransferenciaIn = 0;
            let totalCreditoIn = 0; // NEW
            let totalOtroIn = 0;
            let totalCashAdditions = 0;
            let totalCashOut = 0;
            let totalGrossProfit = 0; // NEW: overall gross profit for the period

            const salesByEmployee = {}; // Aggregates sales per logged-in user (can be a team account)
            const individualCommissionsConsolidated = {}; // NEW: Aggregates commissions per individual (even if part of a team)
            const productPeriodSummary = {}; // Used to store product profit and cost

            // Helper to get or create an individual's commission entry
            const getOrCreateIndividualCommissionEntry = (uid, name) => {
                if (!individualCommissionsConsolidated[uid]) {
                    individualCommissionsConsolidated[uid] = {
                        name: name,
                        uid: uid,
                        totalHotdogCommissionEarned: 0,
                        totalGeneralCommissionEarned: 0
                    };
                }
                return individualCommissionsConsolidated[uid];
            };


            sales.forEach((sale) => {
                const saleTotal = sale.total ?? 0;
                const saleDiscount = sale.discountAmount ?? 0;
                const saleProfit = sale.totalProfit ?? 0; // NEW

                totalSales += saleTotal;
                totalDiscount += saleDiscount;
                totalGrossProfit += saleProfit; // NEW

                switch (sale.metodoPago) {
                    case "efectivo":
                        totalCashIn += saleTotal;
                        break;
                    case "tarjeta":
                        totalCardIn += saleTotal;
                        break;
                    case "transferencia":
                        totalTransferenciaIn += saleTotal;
                        break;
                    case "credito": // NEW
                        totalCreditoIn += saleTotal;
                        break;
                    case "otro":
                        totalOtroIn += saleTotal;
                        break;
                    default:
                        console.warn(
                            `Unknown payment method for sale ${sale.id}: ${sale.metodoPago}`
                        );
                        break;
                }

                const employeeId = sale.vendedorId || "Desconocido";
                const employeeNameInSale = sale.vendedorNombre || "Desconocido";
                const employeeMetadata = usersMetadata.find(u => u.uid === employeeId);
                const isTeamAccount = employeeMetadata?.isTeamAccount || false;

                // Aggregation for salesByEmployee (based on logged-in user/account)
                if (!salesByEmployee[employeeId]) {
                    salesByEmployee[employeeId] = {
                        name: employeeNameInSale,
                        uid: employeeId,
                        totalSales: 0,
                        cashSales: 0,
                        cardSales: 0,
                        transferenciaSales: 0,
                        creditoSales: 0, // NEW
                        otroSales: 0,
                        numSales: 0,
                        numHotdogsSold: 0, // Used for the logged-in user's general commission calculation
                        generalCommissionEnabled: employeeMetadata?.generalCommissionEnabled || false,
                        generalCommissionAmount: employeeMetadata?.generalCommissionAmount ?? 0,
                        hotdogCommissionEnabled: employeeMetadata?.hotdogCommissionEnabled || false,
                        hotdogCommissionPerItem: employeeMetadata?.hotdogCommissionPerItem ?? 0,
                        totalGeneralCommissionEarned: 0,
                        totalHotdogCommissionEarned: 0, // This is for the logged-in account's direct hotdog commission
                        shiftTeamMembers: sale.shiftTeamMembers || [], // Stored for display
                        shiftName: sale.shiftName || '' // Stored for display
                    };
                }
                salesByEmployee[employeeId].totalSales += saleTotal;
                salesByEmployee[employeeId].numSales++;

                // Commission calculation for the logged-in user/account (General Commission)
                if (employeeMetadata?.generalCommissionEnabled && employeeMetadata?.generalCommissionAmount > 0) {
                     salesByEmployee[employeeId].totalGeneralCommissionEarned += (employeeMetadata.generalCommissionAmount); // Commission per sale
                }


                // Commission calculation for INDIVIDUALS (including splitting for team accounts)
                if (isTeamAccount) {
                    // For team accounts, split hotdog commission among recorded team members
                    const teamMembersInSale = sale.shiftTeamMembers || [];
                    if (sale.totalHotdogCommission > 0 && teamMembersInSale.length > 0) {
                        const commissionPerTeamMember = sale.totalHotdogCommission / teamMembersInSale.length;
                        teamMembersInSale.forEach(memberName => {
                            const memberUser = usersMetadata.find(u => u.name === memberName || u.username === memberName);
                            if (memberUser) {
                                const individualEntry = getOrCreateIndividualCommissionEntry(memberUser.uid, memberUser.name || memberUser.username);
                                individualEntry.totalHotdogCommissionEarned += commissionPerTeamMember;
                            } else {
                                console.warn(`Team member "${memberName}" not found in users metadata for commission splitting.`);
                            }
                        });
                    }
                    // General commission for a team account usually goes to the account itself, not split.
                    // If general commission needs to be split among team members, that logic would go here.
                    // Based on "cada un tenga sus comisiones en la ventas de hotdog", assuming general commission stays with the team account.
                    if (sale.totalGeneralCommissionEarned > 0) {
                        const teamAccountEntry = getOrCreateIndividualCommissionEntry(employeeId, employeeNameInSale);
                        teamAccountEntry.totalGeneralCommissionEarned += sale.totalGeneralCommissionEarned;
                    }

                } else {
                    // For individual accounts, commissions go directly to them
                    const individualEntry = getOrCreateIndividualCommissionEntry(employeeId, employeeNameInSale);
                    individualEntry.totalHotdogCommissionEarned += sale.totalHotdogCommission ?? 0;
                    individualEntry.totalGeneralCommissionEarned += (employeeMetadata?.generalCommissionEnabled ? (employeeMetadata.generalCommissionAmount) : 0);
                }


                switch (sale.metodoPago) {
                    case "efectivo":
                        salesByEmployee[employeeId].cashSales += saleTotal;
                        break;
                    case "tarjeta":
                        salesByEmployee[employeeId].cardSales += saleTotal;
                        break;
                    case "transferencia":
                        salesByEmployee[employeeId].transferenciaSales += saleTotal;
                        break;
                    case "credito": // NEW
                        salesByEmployee[employeeId].creditoSales += saleTotal;
                        break;
                    case "otro":
                        salesByEmployee[employeeId].otroSales += saleTotal;
                        break;
                }

                // Aggregate hotdogs sold by the logged-in account (for general commission calculation if it was per hotdog)
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach((item) => {
                        if (!item || !item.id) {
                            console.warn(
                                "Skipping sale item with missing ID in report processing:",
                                item
                            );
                            return;
                        }
                        const itemId = item.id;
                        if (!productPeriodSummary[itemId]) {
                            productPeriodSummary[itemId] = {
                                id: itemId,
                                name: item.name || "Producto Desconocido",
                                quantitySold: 0,
                                totalRevenue: 0, // total selling price
                                totalCost: 0, // total cost price
                                totalProfit: 0 // total profit for this product
                            };
                        }
                        productPeriodSummary[itemId].quantitySold += item.quantity ?? 0;
                        productPeriodSummary[itemId].totalRevenue += (item.quantity ?? 0) * (item.price ?? 0);
                        productPeriodSummary[itemId].totalCost += (item.quantity ?? 0) * (item.costPriceAtTimeOfSale ?? 0); // NEW: sum total cost
                        productPeriodSummary[itemId].totalProfit += (item.profitPerItem ?? 0); // NEW: sum total profit

                        const isHotdog = HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION.some(keyword =>
                            (item.name || '').toLowerCase().includes(keyword.toLowerCase())
                        );
                        if (isHotdog) {
                            salesByEmployee[employeeId].numHotdogsSold += item.quantity;
                        }
                    });
                }
            });

            cashAdditions.forEach((addition) => {
                totalCashAdditions += addition.amount ?? 0;
            });

            cashOutflows.forEach((output) => {
                totalCashOut += output.amount ?? 0;
            });

            // Finalize Individual Commission calculation (for users whose hotdog commissions are enabled and split)
            // This loop ensures that even if a user didn't have sales, but was a team member, they still appear if they earned something.
            // Also adds any general commission that wasn't split.
            Object.keys(individualCommissionsConsolidated).forEach(uid => {
                const individualEntry = individualCommissionsConsolidated[uid];
                const userMetadata = usersMetadata.find(u => u.uid === uid);
                individualEntry.name = userMetadata?.name || userMetadata?.username || individualEntry.name; // Ensure current name for display
            });


            Object.keys(productPeriodSummary).forEach((productId) => {
                const productInCache = productsCache.find((p) => p.id === productId);
                productPeriodSummary[productId].currentStock =
                    productInCache?.stock ?? "N/A";
                productPeriodSummary[productId].productCode = productInCache?.code || "N/A"; // NEW: Add product code
                productPeriodSummary[productId].productCategory = productInCache?.category || "N/A"; // NEW: Add product category
                productPeriodSummary[productId].sellingPrice = productInCache?.price ?? 0; // NEW: Add selling price
                productPeriodSummary[productId].costPrice = productInCache?.costPrice ?? 0; // NEW: Add cost price
                productPeriodSummary[productId].margin = (productPeriodSummary[productId].sellingPrice - productPeriodSummary[productId].costPrice) / productPeriodSummary[productId].sellingPrice;
            });

            const estimatedClosingCash =
                initialPettyCash + totalCashIn + totalCashAdditions - totalCashOut;

            currentReportData = {
                period: `${startDateInput} al ${endDateInput}`,
                initialPettyCash: initialPettyCash,
                totalSales,
                totalDiscount,
                totalCashIn,
                totalCardIn,
                totalTransferenciaIn,
                totalCreditoIn, // NEW
                totalOtroIn,
                totalCashAdditions,
                totalCashOut,
                totalGrossProfit, // NEW
                estimatedClosingCash,
                salesByEmployee,
                individualCommissionsConsolidated: Object.values(individualCommissionsConsolidated), // NEW
                productPeriodSummary: Object.values(productPeriodSummary),
                sales,
                cashAdditions,
                cashOutflows,
                inventoryMovements,
                usersMetadata
            };

            // Render the report in the UI
            cuadreCajaUI.reportDetailsContainer.innerHTML = renderCashReport(currentReportData);
        } catch (error) {
            console.error("Error generando cash report:", error);
            if (cuadreCajaUI.reportDetailsContainer)
                cuadreCajaUI.reportDetailsContainer.innerHTML =
                '<p class="placeholder-text" style="color:red;">Error al generar el reporte.</p>';
            if (error.code === "permission-denied") {
                showAlert(
                    "Error de permisos: No tienes acceso para generar el reporte. Asegúrate de que tus Security Rules lo permitan.",
                    "error"
                );
            } else {
                showAlert(
                    "Error al generar el reporte de cuadre. Intenta de nuevo. Verifica la consola para más detalles (posibles índices de Firestore faltantes, problemas de conexión).",
                    "error"
                );
            }
            currentReportData = null;
        } finally {
            if (cuadreCajaUI.generateReportButton) {
                cuadreCajaUI.generateReportButton.disabled = false;
                cuadreCajaUI.generateReportButton.textContent = "Generar Reporte";
            }
            // Update print button visibility based on whether report data exists and user role
            if (cuadreCajaUI.printReportButton) {
                // START MODIFICACIÓN: Permitir que las cuentas de equipo impriman reportes
                if (currentReportData && currentUser && (currentUser.role === 'admin' || currentUser.isTeamAccount)) {
                    cuadreCajaUI.printReportButton.classList.remove("hidden");
                } else {
                    cuadreCajaUI.printReportButton.classList.add("hidden");
                }
                // FIN MODIFICACIÓN
            }
        }
    };

    /**
     * Generates the HTML string for the cash report.
     * @param {object} reportData - The processed report data.
     * @returns {string} The HTML string representation of the report.
     */
    const renderCashReport = (reportData) => {
        const {
            period,
            initialPettyCash = 0,
            totalSales = 0,
            totalDiscount = 0,
            totalCashIn = 0,
            totalCardIn = 0,
            totalTransferenciaIn = 0,
            totalCreditoIn = 0, // NEW
            totalOtroIn = 0,
            totalCashAdditions = 0,
            totalCashOut = 0,
            totalGrossProfit = 0, // NEW
            estimatedClosingCash = 0,
            salesByEmployee = {},
            individualCommissionsConsolidated = [], // NEW
            productPeriodSummary = [],
            sales = [],
            cashAdditions = [],
            cashOutflows = [],
            inventoryMovements = [],
            usersMetadata = []
        } = reportData;

        const isAdmin = currentUser && currentUser.role === "admin";

        let html = `
                <h3>Reporte de Cuadre de Caja</h3>
                <p>Periodo: <strong>${ period || "N/A" }</strong></p>
                 <p>Saldo Inicial Caja Chica (Para este reporte): <strong>${formatPrice( initialPettyCash )}</strong></p>
            `;

        if (
            sales.length > 0 || cashAdditions.length > 0 || cashOutflows.length > 0 || inventoryMovements.length > 0
        ) {
            html += `
                    <div class="report-summary">
                        <h4>Resumen General</h4>
                        <p>Total Ventas (Neto): <strong>${formatPrice( totalSales )}</strong></p>
                        <p>Total Descuentos Aplicados: <strong style="color: var(--bg-success);">${formatPrice( totalDiscount )}</strong></p>
                        ${isAdmin ? `<p><strong>Ganancia Bruta General: <strong style="color: var(--bg-success);">${formatPrice(totalGrossProfit)}</strong></p>` : ''} <!-- Hidden for collaborators -->
                        <p>Ingresos Efectivo por Ventas: <strong style="color: var(--bg-success);">${formatPrice( totalCashIn )}</strong></p>
                        <p>Ingresos Tarjeta por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalCardIn )}</strong></p>
                        <p>Ingresos Transferencia por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalTransferenciaIn )}</strong></p>
                        <p>Ingresos Crédito por Ventas: <strong style="color: var(--bg-info);">${formatPrice( totalCreditoIn )}</strong></p> <!-- NEW -->
                        <p>Ingresos Otro Método por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalOtroIn )}</strong></p>
                        <p><strong>Total Ingresos por Ventas (Sumado): ${formatPrice(
                          totalCashIn + totalCardIn + totalTransferenciaIn + totalCreditoIn + totalOtroIn // NEW
                        )}</strong></p>
                        <p>Total Adiciones a Caja: <strong style="color: var(--bg-success);">${formatPrice( totalCashAdditions )}</strong></p>
                        <p>Total Salidas de Caja: <strong style="color: var(--bg-danger);">${formatPrice( totalCashOut )}</strong></p>
                        <p><strong>Saldo Neto Estimado en Efectivo al Cierre: ${formatPrice( estimatedClosingCash )}</strong></p>
                    </div>
                `;
            
            // Sales by Employee section (hidden for collaborators)
            if (isAdmin) {
                html += `
                        <h4>Ventas por Cuenta de Vendedor (Login)</h4>
                        <ul class="sales-by-employee-list">
                    `;
                const sortedEmployeeKeys = Object.keys(salesByEmployee).sort((a, b) => {
                    const nameA = salesByEmployee[a].name || "Z";
                    const nameB = salesByEmployee[b].name || "Z";
                    return nameA.localeCompare(nameB);
                });

                if (sortedEmployeeKeys.length > 0) {
                    sortedEmployeeKeys.forEach((employeeKey) => {
                        const data = salesByEmployee[employeeKey];
                        // General commission for the logged-in account
                        const generalCommissionInfo = data.generalCommissionEnabled ?
                            `Comisión General: ${formatPrice(data.generalCommissionAmount ?? 0)}/venta (${data.numSales} ventas = ${formatPrice(data.totalGeneralCommissionEarned ?? 0)})` :
                            `Sin Comisión General`;

                        const displayId =
                            data.uid && data.uid !== "Desconocido" ?
                            data.uid.substring(0, 6) + "..." :
                            "N/A";
                        html += `<li><strong>${data.name || "Desconocido"} <small>(ID: ${displayId})</small></strong>: ${formatPrice(data.totalSales ?? 0)} (${data.numSales} ventas)<br>`;
                        // NEW: Display team members if this is a shared account
                        if (data.shiftTeamMembers && data.shiftTeamMembers.length > 0) {
                            html += `<small>Equipo: ${data.shiftTeamMembers.join(', ')}</small><br>`;
                            if (data.shiftName) {
                                html += `<small>Turno: ${data.shiftName}</small><br>`;
                            }
                        }
                        html += `<span class="commission-info">${generalCommissionInfo}</span><br>
                            <br>
                            Total de Venta por Método: (Ef: ${formatPrice(data.cashSales ?? 0)}, Tar: ${formatPrice(data.cardSales ?? 0)}, Trans: ${formatPrice(data.transferenciaSales ?? 0)}, Créd: ${formatPrice(data.creditoSales ?? 0)}, Otro: ${formatPrice(data.otroSales ?? 0)})
                        </li>`;
                    });
                } else {
                    html += `<li><p class="placeholder-text">No hay ventas registradas por vendedor en este período.</p></li>`;
                }
                html += `</ul>`;
            }

            // Individual Commissions Consolidated Section (hidden for collaborators)
            if (isAdmin) {
                html += `
                    <h4>Comisiones Consolidadas por Empleado Individual</h4>
                    <ul class="individual-commission-summary">
                `;
                const sortedIndividualCommissions = [...individualCommissionsConsolidated].sort((a, b) => {
                    const nameA = a.name || "Z";
                    const nameB = b.name || "Z";
                    return nameA.localeCompare(nameB);
                });

                if (sortedIndividualCommissions.length > 0) {
                    sortedIndividualCommissions.forEach(individual => {
                        const displayId =
                            individual.uid && individual.uid !== "Desconocido" ?
                            individual.uid.substring(0, 6) + "..." :
                            "N/A";
                        const totalCommission = (individual.totalGeneralCommissionEarned ?? 0) + (individual.totalHotdogCommissionEarned ?? 0);

                        html += `
                            <li>
                                <strong>${individual.name || "Desconocido"} <small>(ID: ${displayId})</small></strong>:
                                <br>
                                <span class="commission-info">Total General: ${formatPrice(individual.totalGeneralCommissionEarned ?? 0)}</span>
                                <br>
                                <span class="commission-info">Total Hotdog: ${formatPrice(individual.totalHotdogCommissionEarned ?? 0)}</span>
                                <br>
                                <strong>TOTAL COMISIÓN: ${formatPrice(totalCommission)}</strong>
                            </li>
                        `;
                    });
                } else {
                    html += `<li><p class="placeholder-text">No se generaron comisiones individuales en este período.</p></li>`;
                }
                html += `</ul>`;
            }


            html += `
                     <h4>Resumen de Productos Vendidos (${productPeriodSummary.length} productos)</h4>
                 `;
            if (productPeriodSummary.length > 0) {
                const sortedProductSummary = [...productPeriodSummary].sort((a, b) => {
                    const nameA = a.name || "Z";
                    const nameB = b.name || "Z";
                    return nameA.localeCompare(nameB);
                });

                html += `
                         <table>
                             <thead>
                                 <tr>
                                     <th data-label="Código">Código</th>
                                     <th data-label="Nombre">Nombre</th>
                                     <th data-label="Cant. Vendida">Cant. Vendida</th>
                                     <th data-label="Ingresos">Ingresos</th>
                                     ${isAdmin ? '<th data-label="Costo">Costo</th>' : ''} <!-- Hidden for collaborators -->
                                     ${isAdmin ? '<th data-label="Ganancia">Ganancia</th>' : ''} <!-- Hidden for collaborators -->
                                     <th data-label="Stock Actual">Stock Actual</th>
                                 </tr>
                             </thead>
                             <tbody>
                     `;
                sortedProductSummary.forEach((item) => {
                    const stockValue =
                        item.currentStock !== "N/A" ? item.currentStock : -1;
                    const stockClass =
                        typeof stockValue === "number" ?
                        stockValue <= 0 ?
                        "out-of-stock" :
                        stockValue <= (LOW_STOCK_THRESHOLD ?? 0) ?
                        "low-stock" :
                        "" :
                        "";
                    const profitColor = (item.totalProfit ?? 0) >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)';


                    html += `
                             <tr class="${stockClass}">
                                 <td data-label="Código">${item.productCode || 'N/A'}</td>
                                 <td data-label="Nombre">${item.name || "Producto sin nombre"}</td>
                                 <td data-label="Cant. Vendida">${item.quantitySold ?? 0}</td>
                                 <td data-label="Ingresos"><strong>${formatPrice(item.totalRevenue ?? 0)}</strong></td>
                                 ${isAdmin ? `<td data-label="Costo">${formatPrice(item.totalCost ?? 0)}</td>` : ''}
                                 ${isAdmin ? `<td data-label="Ganancia"><strong style="color: ${profitColor};">${formatPrice(item.totalProfit ?? 0)}</strong></td>` : ''}
                                 <td data-label="Stock Actual">${item.currentStock}</td>
                             </tr>
                         `;
                });
                html += `</tbody></table>`;
            } else {
                html +=
                    '<p class="placeholder-text">No se vendieron productos en este rango de fechas.</p>';
            }


            html += `
                      <h4>Detalle de Adiciones a Caja (${cashAdditions.length} adiciones encontradas)</h4>
                 `;
            if (cashAdditions.length > 0) {
                const sortedAdditions = [...cashAdditions].sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
                    return timeA - timeB;
                });
                html += `
                         <table>
                             <thead>
                                 <tr>
                                     <th data-label="ID Movimiento">ID Movimiento</th>
                                     <th data-label="Fecha/Hora">Fecha/Hora</th>
                                     ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''} <!-- Hidden for collaborators -->
                                     <th data-label="Descripción">Descripción</th>
                                     <th data-label="Monto">Monto</th>
                                 </tr>
                             </thead>
                             <tbody>
                     `;
                sortedAdditions.forEach((addition) => {
                    const additionDate =
                        addition.timestamp &&
                        typeof addition.timestamp.toDate === "function" ?
                        addition.timestamp.toDate().toLocaleString("es-DO") :
                        "N/A";
                    const recordedBy = usersMetadata.find(
                        (u) => u.uid === addition.recordedBy?.id
                    );
                    const recordedByName =
                        recordedBy?.username || recordedBy?.name || addition.recordedBy?.name || "Desconocido";

                    html += `
                               <tr>
                                   <td data-label="ID Movimiento">${addition.id ? addition.id.substring(0, 6) + '...' : 'N/A'}</td>
                                   <td data-label="Fecha/Hora">${additionDate}</td>
                                   ${isAdmin ? `<td data-label="Registrado Por">${recordedByName}</td>` : ''}
                                   <td data-label="Descripción">${addition.description || "N/A"}</td>
                                   <td data-label="Monto"><strong style="color: var(--bg-success);">${formatPrice(addition.amount ?? 0)}</strong></td>
                               </tr>
                           `;
                });
                html += `</tbody></table>`;
            } else {
                html +=
                    '<p class="placeholder-text">No se encontraron adiciones a Caja en este rango de fechas.</p>';
            }


            html += `
                     <h4>Detalle de Salidas de Caja (${cashOutflows.length} salidas encontradas)</h4>
                 `;
            if (cashOutflows.length > 0) {
                const sortedOutflows = [...cashOutflows].sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
                    return timeA - timeB;
                });
                html += `
                             <table>
                                 <thead>
                                     <tr>
                                         <th data-label="ID Movimiento">ID Movimiento</th>
                                         <th data-label="Fecha/Hora">Fecha/Hora</th>
                                         ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''} <!-- Hidden for collaborators -->
                                         <th data-label="Descripción">Descripción</th>
                                         <th data-label="Monto">Monto</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                          `;
                sortedOutflows.forEach(output => {
                    const outputDate = output.timestamp && typeof output.timestamp.toDate === 'function' ? output.timestamp.toDate().toLocaleString('es-DO') : 'N/A';
                    const recordedBy = usersMetadata.find(u => u.uid === output.recordedBy?.id);
                    const recordedByName = recordedBy?.username || recordedBy?.name || output.recordedBy?.name || 'Desconocido';
                    html += `
                                  <tr>
                                      <td data-label="ID Movimiento">${output.id ? output.id.substring(0, 6) + '...' : 'N/A'}</td>
                                      <td>${outputDate}</td>
                                      ${isAdmin ? `<td>${recordedByName}</td>` : ''}
                                      <td>${output.description || 'N/A'}</td>
                                      <td><strong style="color: var(--bg-danger);">${formatPrice(output.amount ?? 0)}</strong></td>
                                  </tr>
                              `;
                });
                html += `</tbody></table>`;
            } else {
                html += '<p class="placeholder-text">No se encontraron salidas de caja en este rango de fechas.</p>';
            }

            html += `
                     <h4>Detalle de Movimientos de Inventario (${inventoryMovements.length} movimientos encontrados)</h4>
                 `;
            if (inventoryMovements.length > 0) {
                const sortedInventoryMovements = [...inventoryMovements].sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
                    return timeA - timeB;
                });
                html += `
                             <table>
                                 <thead>
                                     <tr>
                                         <th data-label="Fecha/Hora">Fecha/Hora</th>
                                         <th data-label="Producto">Producto</th>
                                         <th data-label="Tipo">Tipo</th>
                                         <th data-label="Cantidad">Cantidad</th>
                                         <th data-label="Descripción">Descripción</th>
                                         ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''} <!-- Hidden for collaborators -->
                                     </tr>
                                 </thead>
                                 <tbody>
                         `;
                sortedInventoryMovements.forEach(move => {
                    const moveDate = move.timestamp && typeof move.timestamp.toDate === "function" ? move.timestamp.toDate().toLocaleString("es-DO") : "N/A";
                    const recordedBy = usersMetadata.find(u => u.uid === move.recordedBy?.id);
                    const recordedByName = recordedBy?.username || recordedBy?.name || move.recordedBy?.name || "Desconocido";

                    let typeDisplay = '';
                    let quantityDisplay = '';
                    let quantityColor = '';
                    if (move.type === 'in') {
                        typeDisplay = 'Entrada';
                        quantityDisplay = `+${move.quantity ?? 0}`;
                        quantityColor = 'var(--bg-success)';
                    } else if (move.type === 'out_waste') {
                        typeDisplay = 'Merma/Daño';
                        quantityDisplay = `-${move.quantity ?? 0}`;
                        quantityColor = 'var(--bg-danger)';
                    } else if (move.type === 'out_use') {
                        typeDisplay = 'Uso Interno';
                        quantityDisplay = `-${move.quantity ?? 0}`;
                        quantityColor = 'var(--bg-danger)';
                    }
                    html += `
                                <tr>
                                    <td>${moveDate}</td>
                                    <td>${move.productName || "Desconocido"}</td>
                                    <td>${typeDisplay}</td>
                                    <td><strong>${quantityDisplay}</strong></td>
                                    <td>${move.description || "Sin descripción"}</td>
                                    ${isAdmin ? `<td>${recordedByName}</td>` : ''}
                                </tr>
                            `;
                });
                html += `</tbody></table>`;
            } else {
                html += '<p class="placeholder-text">No se encontraron movimientos de inventario en este rango de fechas.</p>';
            }


        } else {
            html += '<p class="placeholder-text">No se encontraron ventas ni movimientos de caja o inventario en este rango de fechas.</p>';
        }


        return html; // Return the HTML string
    };

    const handlePrintReport = () => {
        // START MODIFICACIÓN: Permitir que las cuentas de equipo impriman reportes
        if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isTeamAccount)) {
            showAlert('Acceso restringido. Solo administradores y cuentas de equipo pueden imprimir reportes.', "warning");
            return;
        }
        // FIN MODIFICACIÓN
        if (!currentReportData) {
            showAlert('No hay datos de reporte para imprimir. Genera el reporte primero.', "warning");
            return;
        }

        console.log("Preparing report for printing...");

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert('Permite ventanas emergentes para imprimir el reporte.', "warning");
            return;
        }

        // Generate the report HTML content specifically for printing
        // We call renderCashReport again to ensure it's fresh, even if currentReportData is old
        // The renderCashReport function now returns the HTML string.
        const reportHtmlForPrint = renderCashReport(currentReportData);

        let printHtml = `
             <html>
             <head>
                  <title>Reporte de Cuadre de Caja - ${currentReportData.period}</title>
                  <style>
                       body { font-family: 'Roboto', sans-serif; font-size: 11px; line-height: 1.4; margin: 15mm; color: #000; }
                       h3, h4 { margin-top: 1em; margin-bottom: 0.5em; text-align: center; color: #000; }
                       h3 { font-size: 16px; margin-bottom: 10px; }
                       h4 { font-size: 14px; margin-top: 20px; }
                       ul { list-style: none; padding: 0; margin: 0; }
                       li { margin-bottom: 0.3em; padding-bottom: 3px; border-bottom: 1px dashed #ddd; font-size: 12px; }
                       li:last-child { border-bottom: none; }
                       .report-summary, .individual-commission-summary { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; border-radius: 5px; }
                       .report-summary p, .individual-commission-summary p { margin: 0.2em 0; font-size: 12px; }
                       table { width: 100%; border-collapse: collapse; margin-bottom: 1em; page-break-inside: avoid; }
                       th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; vertical-align: top; }
                       th { background-color: #eee; font-weight: bold; }
                       strong { font-weight: bold; }
                       .placeholder-text { font-style: italic; color: #888; text-align: center; }
                       .commission-info { font-size: 0.9em; color: #008000; display: block; margin-top: 5px;}
                       .out-of-stock { color: red; }
                       .low-stock { color: orange; }
                       body, table, th, td {
                          color: #000 !important;
                          background-color: #fff !important;
                          -webkit-print-color-adjust: exact;
                          print-color-adjust: exact;
                       }
                       .print-logo-report {
                           display: block;
                           margin: 5mm auto;
                           max-width: 40mm;
                           height: auto;
                           filter: grayscale(100%);
                           -webkit-filter: grayscale(100%);
                       }
                       /* Alineación de columnas para impresión - Ajustadas */
                       td:nth-child(3),
                       td:nth-child(4),
                       td:nth-child(5),
                       td:nth-child(6) { /* Added for new columns like margin */
                           text-align: right;
                       }
                       td strong[style*="color"] {
                            color: inherit !important;
                       }
                       /* Asegurar colores específicos para montos en tablas */
                       td strong[style*="var(--bg-success)"], td strong[style*="#008000"] { color: #008000 !important; }
                       td strong[style*="var(--bg-danger)"], td strong[style*="#ff0000"] { color: #FF0000 !important; }

                       .report-footer { text-align: center; margin-top: 30px; font-size: 10px; color: #555; }
                       .report-date-print { text-align: center; font-size: 10px; margin-top: 10px; }

                  </style>
             </head>
             <body>
                  <img src="${BUSINESS_LOGO_URL}" class="print-logo-report" alt="Logo Negocio">
                 <h3>Reporte de Cuadre de Caja</h3>
                 <p style="text-align: center; font-size: 12px;">Periodo: <strong>${currentReportData.period || 'N/A'}</strong></p>
                 <p style="text-align: center; font-size: 12px;">Generado el: <strong>${new Date().toLocaleString('es-DO')}</strong></p>
                 <p style="text-align: center; font-size: 12px;">Generado por: <strong>${currentUser.username || 'Admin'}</strong></p>
                 <p style="text-align: center; font-size: 12px;">Saldo Inicial Caja Chica (Para este reporte): <strong>${formatPrice(currentReportData.initialPettyCash)}</strong></p>
         `;

        printHtml += reportHtmlForPrint; // Inject the generated report HTML

        printHtml += `
          <div class="report-footer">
              <p>Reporte generado por La Hotdoguería RD POS</p>
              <p>Sistema de Punto de Venta v1.0</p>
          </div>
          </body></html>`;


        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close(); // Close the print window after printing
        }, 250);
    };

    // Removed exportToCSV function as requested

    const updateLowStockCount = () => {
        if (!mainAppUI.lowStockCountBadge) return;

        const lowStockItems = productsCache.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        const outOfStockItems = productsCache.filter(p => p.stock <= 0);
        const totalAlertItems = lowStockItems.length + outOfStockItems.length;

        if (totalAlertItems > 0) {
            mainAppUI.lowStockCountBadge.textContent = totalAlertItems;
            mainAppUI.lowStockCountBadge.classList.remove('hidden');
            if (outOfStockItems.length > 0) {
                mainAppUI.lowStockCountBadge.style.backgroundColor = 'var(--bg-danger)';
            } else {
                mainAppUI.lowStockCountBadge.style.backgroundColor = 'var(--bg-warning)';
            }
        } else {
            mainAppUI.lowStockCountBadge.classList.add('hidden');
        }
    };

    /**
     * Searches for a specific invoice by its ID and displays it in a modal.
     */
    const handleSearchInvoice = async () => {
        // Collaborators can search invoices, no check needed here.
        if (!db || !cuadreCajaUI.searchInvoiceInput || !modals.invoicePreview?.content) {
            showAlert('La aplicación no está completamente cargada.', 'error');
            return;
        }

        const invoiceId = cuadreCajaUI.searchInvoiceInput.value.trim();
        if (!invoiceId) {
            showAlert('Por favor, ingresa un ID de factura para buscar.', "warning");
            cuadreCajaUI.searchInvoiceInput.focus();
            return;
        }

        cuadreCajaUI.searchInvoiceButton.disabled = true;
        cuadreCajaUI.searchInvoiceButton.textContent = 'Buscando...';

        try {
            const invoiceDoc = await db.collection('sales').doc(invoiceId).get();

            if (invoiceDoc.exists) {
                const saleData = { id: invoiceDoc.id, ...invoiceDoc.data() };
                const isAdmin = currentUser && currentUser.role === "admin";
                const invoiceText = generateInvoiceHTML(saleData, !isAdmin, isAdmin); // Show internal copy for admin

                showModal(modals.invoicePreview, invoiceText, invoiceId);
            } else {
                showAlert(`Factura con ID "${invoiceId}" no encontrada.`, 'warning');
            }
        } catch (error) {
            console.error("Error buscando factura:", error);
            if (error.code === 'permission-denied') {
                showAlert('Error de permisos al buscar factura. Revisa tus Security Rules.', 'error');
            } else {
                showAlert('Error al buscar la factura. Intenta de nuevo.', 'error');
            }
        } finally {
            cuadreCajaUI.searchInvoiceButton.disabled = false;
            cuadreCajaUI.searchInvoiceButton.textContent = 'Buscar Factura';
        }
    };

    /**
     * Loads non-admin, non-team users for selection in the Set Team Members modal.
     */
    const loadUsersForTeamSelection = async () => {
        const teamMembersList = modals.setTeamMembers?.teamMembersList;
        if (!db || !teamMembersList) {
            console.error("DB or team members list element not found for selection.");
            return;
        }

        teamMembersList.innerHTML = '<p class="placeholder-text">Cargando usuarios para selección...</p>';

        try {
            // Se carga todos los usuarios y se filtra en cliente para evitar un índice compuesto
            // que podría no ser intuitivo o necesario para esta funcionalidad específica.
            const snapshot = await db.collection('users').get();
            const nonAdminUsers = snapshot.docs
                .map(doc => ({ uid: doc.id, ...doc.data() }))
                .filter(user => user.role === 'colaborator' && !user.isTeamAccount) // Filtering in client-side
                .sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || '')); // Sorting in client-side


            teamMembersList.innerHTML = ''; // Clear previous content

            if (nonAdminUsers.length === 0) {
                teamMembersList.innerHTML = '<p class="placeholder-text">No hay otros colaboradores disponibles para el equipo.</p>';
                return;
            }

            nonAdminUsers.forEach(user => {
                const li = document.createElement('li');
                // Use user.name first, then user.username, then user.email as fallback
                const displayName = user.name || user.username || user.email || "Desconocido";
                li.innerHTML = `
                    <input type="checkbox" id="team-member-${user.uid}" value="${displayName}" data-uid="${user.uid}">
                    <label for="team-member-${user.uid}">${displayName}</label>
                `;
                const checkbox = li.querySelector('input[type="checkbox"]');
                // Pre-select if already in currentShiftTeamMembers
                if (currentShiftTeamMembers.includes(displayName)) { // Compare by name
                    checkbox.checked = true;
                }
                teamMembersList.appendChild(li);
            });
        } catch (error) {
            console.error("Error loading users for team selection:", error);
            teamMembersList.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar usuarios.</p>';
            showAlert('No se pudieron cargar los usuarios para el equipo.', "error");
        }
    };

    /**
     * Handles saving the selected team members for the current shift.
     */
    const handleSetTeamMembers = () => {
        const modal = modals.setTeamMembers;
        if (!modal || !modal.shiftNameInput || !modal.teamMembersList || !modal.saveButton) {
            console.error("Set team members modal elements not found.");
            return;
        }

        const selectedMembers = [];
        modal.teamMembersList.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selectedMembers.push(checkbox.value); // Value is the display name
        });

        const shiftName = modal.shiftNameInput.value.trim();

        if (selectedMembers.length === 0) {
            showAlert("Por favor, selecciona al menos un miembro para el equipo.", "warning");
            return;
        }

        currentShiftTeamMembers = selectedMembers;
        currentShiftName = shiftName;

        modal.saveButton.disabled = true;
        modal.saveButton.textContent = 'Guardando...';

        showToast(`Equipo del turno guardado: ${selectedMembers.join(', ')}`, "success");
        hideAllModals();
        // The values are saved in global state (currentShiftTeamMembers, currentShiftName) and will be attached to sales.
    };

    /**
     * Generates and prints a report for the current shift members.
     */
    const generateShiftReportHTML = () => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = now.toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' });

        let reportContent = ``;
        reportContent += `    La Hotdoguería RD\n`;
        reportContent += `  "El clásico que nunca falla"\n`;
        reportContent += `----------------------------------\n`;
        reportContent += `  REPORTE DE TURNO ACTUAL\n`;
        reportContent += `----------------------------------\n`;
        reportContent += `Fecha y Hora: ${formattedDate} ${formattedTime}\n`;
        reportContent += `Generado por: ${currentUser?.username || currentUser?.name || 'Usuario'}\n`;
        reportContent += `\n`;

        reportContent += `Nombre del Turno: ${currentShiftName || 'Sin Nombre de Turno'}\n`;
        reportContent += `Miembros del Equipo:\n`;
        if (currentShiftTeamMembers.length > 0) {
            currentShiftTeamMembers.forEach((member, index) => {
                reportContent += `- ${member}\n`;
            });
        } else {
            reportContent += `- Ninguno seleccionado.\n`;
        }
        reportContent += `\n`;
        reportContent += `----------------------------------\n`;
        reportContent += `  Fin del Reporte\n`;
        reportContent += `----------------------------------\n`;

        return reportContent;
    };


    // --- Event Listeners ---
    loginForm.loginButton?.addEventListener("click", handleLogin);
    loginForm.usernameInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });
    loginForm.password?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });
    loginForm.forgotPasswordLink?.addEventListener("click", (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    if (passwordToggle && loginPasswordInput) {
        passwordToggle.addEventListener("click", () => {
            const type = loginPasswordInput.getAttribute("type") === "password" ? "text" : "password";
            loginPasswordInput.setAttribute("type", type);

            const icon = passwordToggle.querySelector("i");
            if (icon) {
                icon.classList.toggle("fa-eye", type === "password");
                icon.classList.toggle("fa-eye-slash", type === "text");
            }
        });
    }

    recoverForm.sendResetEmailButton?.addEventListener(
        "click",
        sendPasswordResetEmail
    );
    recoverForm.resetEmailInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendPasswordResetEmail(); // Corrected function name
    });
    recoverForm.backToLoginLink?.addEventListener("click", (e) => {
        e.preventDefault();
        showScreen(screens.login);
    });

    mainAppUI.themeToggleButton?.addEventListener("click", toggleTheme);
    mainAppUI.logoutButton?.addEventListener("click", handleLogout);

    document.querySelectorAll(".nav-list > li > a[data-section]").forEach((link) => {
        if (link) {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    showSection(section);
                } else {
                    console.warn("Nav link clicked without data-section:", link);
                }
            });
        }
    });

    if (mainAppUI.discountNavLink) {
        mainAppUI.discountNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Ensure we are in the 'ventas' section
            showSection('ventas');
            if (ventasUI.applyPromoSection) {
                ventasUI.applyPromoSection.classList.toggle('hidden');
                if (!ventasUI.applyPromoSection.classList.contains('hidden')) {
                    // Reset discount inputs if no discount is currently applied
                    if (cartDiscountType === 'none') {
                        if (ventasUI.discountTypeSelect) ventasUI.discountTypeSelect.value = 'percentage';
                        if (ventasUI.discountValueInput) ventasUI.discountValueInput.value = '';
                        if (ventasUI.discountValueGroup) ventasUI.discountValueGroup.classList.remove('hidden');
                    }
                    if (ventasUI.discountValueInput) ventasUI.discountValueInput.focus();
                }
            }
        });
    }

    if (ventasUI.productSearchInput) {
        ventasUI.productSearchInput.addEventListener("input", () =>
            loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value)
        );
        ventasUI.productSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const searchTerm = ventasUI.productSearchInput.value.trim();
                if (searchTerm) {
                    addProductToCartByCode(searchTerm);
                    ventasUI.productSearchInput.value = ''; // Clear input after trying to add by code
                    loadProductsFromFirestore('', ventasUI.categorySelect?.value); // Re-render grid without search term
                }
            }
        });
    }

    if (ventasUI.categorySelect) {
        ventasUI.categorySelect.addEventListener('change', () => {
            loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect.value);
        });
    }

    if (ventasUI.applyManualDiscountButton) {
        ventasUI.applyManualDiscountButton.addEventListener('click', handleApplyManualDiscount);
    }
    if (ventasUI.discountTypeSelect) {
        ventasUI.discountTypeSelect.addEventListener('change', () => {
            const isDiscountManual = ['percentage', 'fixed'].includes(ventasUI.discountTypeSelect.value);
            if (ventasUI.discountValueGroup) {
                ventasUI.discountValueGroup.classList.toggle('hidden', !isDiscountManual);
            }
        });
        ventasUI.discountTypeSelect.dispatchEvent(new Event('change')); // Trigger on load to set initial state
    }


    const handlePaymentMethodChange = () => {
        const subtotal = calculateCartSubtotal();
        const discountAmount = cartDiscountAmount;
        const total = subtotal - discountAmount;
        updateChangeDisplay(total);
    };
    const handleAmountReceivedInput = () => {
        const subtotal = calculateCartSubtotal();
        const discountAmount = cartDiscountAmount;
        const total = subtotal - discountAmount;
        updateChangeDisplay(total);
    };

    if (cartUI.paymentMethodSelect) {
        cartUI.paymentMethodSelect.addEventListener("change", handlePaymentMethodChange);
    }
    if (cartUI.amountReceivedInput) {
        cartUI.amountReceivedInput.addEventListener("input", handleAmountReceivedInput);
        cartUI.amountReceivedInput.addEventListener("change", handleAmountReceivedInput);
    }

    // Process Sale Button Event Listener
    if (cartUI.processSaleButton) {
        cartUI.processSaleButton.addEventListener("click", handleProcessSale);
    }


    modals.invoicePreview?.printButton?.addEventListener(
        "click",
        handlePrintInvoice
    );
    modals.invoicePreview?.deleteButton?.addEventListener(
        "click",
        handleDeleteInvoice
    );
    modals.invoicePreview?.modifyButton?.addEventListener(
        "click",
        handleModifyInvoice
    );

    modals.editCartItem?.saveButton?.addEventListener(
        "click",
        handleSaveEditedCartItem
    );
    modals.editCartItem?.element?.addEventListener("keypress", (e) => {
        if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
            e.preventDefault();
            modals.editCartItem?.saveButton?.click();
        }
    });


    inventarioUI.addProductButton?.addEventListener("click", () =>
        // Only admins can add products, UI is handled by `updateUIVisibilityBasedOnRole`
        showModal(modals.product, "add")
    );
    modals.product?.saveButton?.addEventListener("click", handleSaveProduct);
    modals.product?.element?.addEventListener("keypress", (e) => {
        if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
            e.preventDefault();
            modals.product?.saveButton?.click();
        }
    });


    usuariosUI.addUserButton?.addEventListener("click", () =>
        // Only admins can add users, UI is handled by `updateUIVisibilityBasedOnRole`
        showModal(modals.user, "add")
    );
    modals.user?.saveButton?.addEventListener("click", handleSaveUser);
    modals.user?.element?.addEventListener("keypress", (e) => {
        if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
            e.preventDefault();
            modals.user?.saveButton?.click();
        }
    });

    salidaEntradaUI.addPettyCashButton?.addEventListener("click", () => {
        // Collaborators can also add petty cash, but require admin code
        if (!currentUser) { // Should not happen as button is only visible after login
            showAlert("No hay usuario logueado.", "warning");
            return;
        }
        console.log("[DEBUG] Add Petty Cash button clicked. Triggering Admin Code Modal.");
        if (currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'agregar saldo a Caja', () => handleRecordPettyCashAddition());
        } else {
            handleRecordPettyCashAddition();
        }
    });
    salidaEntradaUI.addPettyCashAmountInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            salidaEntradaUI.addPettyCashButton?.click();
        }
    });
    salidaEntradaUI.addPettyCashDescriptionInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            salidaEntradaUI.addPettyCashAmountInput?.focus(); // Move focus to amount input
        }
    });


    salidaEntradaUI.recordButton?.addEventListener("click", () => {
        // Collaborators can also record cash output, but require admin code
        if (!currentUser) { // Should not happen as button is only visible after login
            showAlert("No hay usuario logueado.", "warning");
            return;
        }
        console.log("[DEBUG] Record Outflow button clicked. Triggering Admin Code Modal.");
        if (currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'registrar salida de caja', () => handleRecordOutput());
        } else {
            handleRecordOutput();
        }
    });
    salidaEntradaUI.outputAmountInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            salidaEntradaUI.recordButton?.click();
        }
    });
    salidaEntradaUI.outputDescriptionInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            salidaEntradaUI.outputAmountInput?.focus(); // Move focus to amount input
        }
    });

    if (inventarioUI.openInventoryMovementModalButton) {
        inventarioUI.openInventoryMovementModalButton.addEventListener('click', () => {
            // Collaborators can open this modal and record movement, but require admin code for saving
            if (!currentUser) { // Should not happen as button is only visible after login
                showToast("No hay usuario logueado.", "warning");
                return;
            }
            populateProductSelectForInventoryMovements();
            showModal(modals.inventoryMovement);
            if (modals.inventoryMovement.productSelect) modals.inventoryMovement.productSelect.focus();
        });
    }
    if (modals.inventoryMovement.saveButton) {
        modals.inventoryMovement.saveButton.addEventListener('click', () => {
            // Collaborators can save inventory movement, but require admin code
            if (!currentUser) { // Should not happen as button is only visible after login
                showAlert("No hay usuario logueado.", "warning");
                return;
            }
            if (currentUser.role === 'colaborator') {
                showModal(modals.adminCode, 'registrar movimiento de inventario', handleRecordInventoryMovement);
            } else {
                handleRecordInventoryMovement();
            }
        });
    }
    if (modals.inventoryMovement.element) {
        modals.inventoryMovement.element.addEventListener("keypress", (e) => {
            if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
                e.preventDefault();
                modals.inventoryMovement.saveButton?.click();
            }
        });
    }


    cuadreCajaUI.generateReportButton?.addEventListener(
        "click",
        generateCashReport
    );
    cuadreCajaUI.searchInvoiceButton?.addEventListener(
        "click",
        handleSearchInvoice
    );
    cuadreCajaUI.searchInvoiceInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            cuadreCajaUI.searchInvoiceButton?.click();
        }
    });
    cuadreCajaUI.printReportButton?.addEventListener("click", handlePrintReport);
    // Removed export to CSV as requested
    // if (cuadreCajaUI.exportReportCsvButton) { // REMOVED
    //     cuadreCajaUI.exportReportCsvButton.addEventListener("click", () => { // REMOVED
    //         if (!currentUser || currentUser.role !== 'admin') { // REMOVED
    //             showToast('Acceso restringido. Solo administradores pueden exportar reportes.', "warning"); // REMOVED
    //             return; // REMOVED
    //         } // REMOVED
    //         if (!currentReportData) { // REMOVED
    //             showToast('No hay datos de reporte para exportar.', "warning"); // REMOVED
    //             return; // REMOVED
    //         } // REMOVED
    //         exportToCSV(currentReportData.sales, `reporte_ventas_${currentReportData.period.replace(/ /g, '_')}.csv`); // REMOVED
    //     }); // REMOVED
    // } // REMOVED

    cuadreCajaUI.initialPettyCashInput?.addEventListener("input", () => {
        // This input should be visible for both roles, and updates the report on change
        if (
            cuadreCajaUI.section?.classList.contains("active") &&
            currentReportData
        ) {
            currentReportData.initialPettyCash =
                parseFloat(cuadreCajaUI.initialPettyCashInput.value) || 0;
            currentReportData.estimatedClosingCash =
                currentReportData.initialPettyCash +
                currentReportData.totalCashIn +
                currentReportData.totalCashAdditions -
                currentReportData.totalCashOut;
            cuadreCajaUI.reportDetailsContainer.innerHTML = renderCashReport(currentReportData); // Re-render the report
        }
    });

    // NEW: Event listener for "Set Team Members" button
    if (mainAppUI.setTeamMembersButton) {
        mainAppUI.setTeamMembersButton.addEventListener('click', () => {
            if (!currentUser || !currentUser.isTeamAccount) {
                showAlert("Solo las cuentas de equipo pueden configurar los miembros del turno.", "warning");
                return;
            }
            showModal(modals.setTeamMembers);
        });
    }
    // NEW: Event listener for saving team members
    if (modals.setTeamMembers?.saveButton) {
        modals.setTeamMembers.saveButton.addEventListener('click', handleSetTeamMembers);
    }
    // NEW: Event listener for printing shift report
    if (modals.setTeamMembers?.printButton) {
        modals.setTeamMembers.printButton.addEventListener('click', () => {
            if (!currentUser || !currentUser.isTeamAccount) {
                showAlert("Solo las cuentas de equipo pueden imprimir reportes de turno.", "warning");
                return;
            }
            const shiftReportContent = generateShiftReportHTML();
            printInvoiceContent(shiftReportContent, "Reporte de Turno Actual");
        });
    }
    // NEW: Event listener for Shift Name input on Enter
    if (modals.setTeamMembers?.shiftNameInput) {
        modals.setTeamMembers.shiftNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission if any
                handleSetTeamMembers();
            }
        });
    }


    if (modals.adminCode?.element) {
        modals.adminCode.verifyButton?.addEventListener("click", () => {
            if (modals.adminCode.input?.value === ADMIN_CODE) {
                const currentCallback = adminActionCallback;
                hideAllModals();

                if (currentCallback) {
                    // Check if current user is admin OR if the action is designed for collab with code
                    // For now, assume any action requiring admin code can be done by collaborator with code
                    currentCallback();
                } else {
                    showAlert("Error interno: No se definió una acción a ejecutar.", "error");
                }
            } else {
                showAlert("Código de administrador incorrecto.", "error");
                if (modals.adminCode.input) {
                    modals.adminCode.input.value = "";
                    modals.adminCode.input.focus();
                }
            }
        });
        modals.adminCode.input?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                modals.adminCode.verifyButton?.click();
            }
        });
    }

    if (modals.confirmAction?.element) {
        modals.confirmAction.yesButton?.addEventListener("click", () => {
            const currentCallback = confirmActionCallback;
            hideAllModals();
            if (currentCallback) currentCallback();
        });
        modals.confirmAction.noButton?.addEventListener("click", hideAllModals);
        // REMOVED: Escape key for confirm action (is now sticky)
        // modals.confirmAction.element?.addEventListener("keydown", (e) => {
        //     if (e.key === "Enter") {
        //         e.preventDefault();
        //         modals.confirmAction.yesButton?.click();
        //     }
        // });
    }

    // Global Escape key listener
    document.body.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModalElement = document.querySelector('.modal:not(.hidden)');
            if (activeModalElement) {
                const modalId = activeModalElement.id;
                // Find the modal object in the 'modals' constant
                const modalObj = Object.values(modals).find(m => m.element?.id === modalId);

                // If it's a sticky modal, prevent default and do nothing (it requires explicit action to close)
                if (modalObj && modalObj.isSticky) {
                    e.preventDefault();
                    // Optionally, give visual feedback that it's sticky
                    // showToast("Por favor, usa los botones del modal para cerrar.", "info", 1500);
                } else {
                    // For non-sticky modals (like invoicePreview) or the guide overlay, allow closing
                    e.preventDefault(); // Still prevent default to avoid browser default behavior
                    hideAllModals(); // This closes all modals
                    // Also explicitly check for the guide overlay as it's not part of the 'modals' object for specific closing logic
                    const guideOverlay = document.getElementById('tour-guide-overlay');
                    if (guideOverlay && !guideOverlay.classList.contains('hidden')) {
                        guideOverlay.classList.add('hidden');
                    }
                }
            } else {
                // If no modals are open, allow browser default behavior (e.g., closing pop-ups, etc.)
                // No need to preventDefault here if nothing active to close
            }
        }
    });


    // --- App Initialization ---
    const initializeApp = () => {
        const savedTheme = localStorage.getItem("appTheme") || "light";
        applyTheme(savedTheme);

        updateDateTime();
        if (window._datetimeUpdateInterval) {
            clearInterval(window._datetimeUpdateInterval);
        }
        window._datetimeUpdateInterval = setInterval(updateDateTime, 60000);

        console.log("Initializing app. Waiting for authentication state...");
        if (screens.splash) {
            showScreen(screens.splash);
        } else {
            console.error("Splash screen element not found. Cannot show splash.");
            if (auth) {
                // Rely on auth.onAuthStateChanged
            } else {
                if (screens.login) showScreen(screens.login);
            }
        }

        setTimeout(() => {
            if (auth) {
                console.log(
                    "Splash duration finished. Relying on onAuthStateChanged for initial screen."
                );
            } else {
                console.error(
                    "Splash finished, but Firebase Auth failed to initialize. App cannot start."

                );
                const splashText = screens.splash?.querySelector("p");
                if (splashText)
                    splashText.textContent =
                    "Error al cargar la aplicación. Revisa la consola para más detalles.";
            }
        }, SPLASH_DURATION);
    };

    if (
        typeof firebase !== "undefined" &&
        firebase.apps.length > 0 &&
        db !== null &&
        auth !== null
    ) {
        initializeApp();
    } else {
        console.error(
            "Firebase SDKs failed to initialize or instances not obtained. App cannot start."
        );
        const splashText = screens.splash?.querySelector("p");
        if (splashText)
            splashText.textContent =
            "Error al cargar la aplicación. Revisa la consola para más detalles.";
    }
});
