/**
 * Imprime el contenido HTML en una nueva ventana/pestaña, esperando a que el logo se cargue.
 * @param {string} content El contenido HTML a imprimir.
 * @param {string} title El título para la ventana de impresión.
 * @param {string} logoUrl La URL del logo a imprimir.
 * @param {function} [callback] Un callback opcional para ejecutar después de la impresión.
 */
function printInvoiceContent(content, title = "Documento", logoUrl = "", callback = null) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Permite ventanas emergentes para imprimir.', "warning");
        if (callback) callback();
        return;
    }

    const currentBusinessLogoUrl = logoUrl;

    let printHtml = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'monospace', 'sans-serif'; font-size: 10px; line-height: 1.2; margin: 0; padding: 5mm; color: #000; background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                pre { font-family: 'monospace', 'sans-serif'; font-size: 10px; margin: 0; white-space: pre-wrap; }
                #logo-container { text-align: center; margin-bottom: 5mm; }
                .business-logo { max-width: 25mm; height: auto; filter: grayscale(100%); -webkit-filter: grayscale(100%); }
                strong { font-weight: bold; }
            </style>
        </head>
        <body>
            <div id="logo-container">
                ${currentBusinessLogoUrl ? `<img src="${currentBusinessLogoUrl}" id="print-logo" class="business-logo" alt="Logo Negocio">` : ''}
            </div>
            <pre>${content}</pre>
        </body>
        </html>
    `;
    printWindow.document.write(printHtml);
    printWindow.document.close();

    const logoImg = printWindow.document.getElementById('print-logo');

    const doPrint = () => {
        printWindow.focus();
        try {
            printWindow.print();
        } catch (e) {
            console.error("Error al intentar imprimir:", e);
            showToast("Ocurrió un error durante la impresión.", "error");
        }
        
        if (callback) callback();
        
        setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.close();
            }
        }, 500);
    };

    if (logoImg) {
        if (logoImg.complete) {
            setTimeout(doPrint, 100);
        } else {
            logoImg.onload = doPrint;
            logoImg.onerror = () => {
                showToast("No se pudo cargar el logo para la impresión.", "warning");
                doPrint();
            };
        }
    } else {
        setTimeout(doPrint, 250);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    // --- Constantes de Configuración ---
    const ADMIN_CODE = "123456";
    const LOW_STOCK_THRESHOLD = 5;
    const SPLASH_DURATION = 1000;
    const HOT_DOG_PRODUCT_NAMES_FOR_PROMO = ["hot dog", "hotdog", "hotdog especial", "hotdogs"];
    const HOT_DOG_PROMO_PRICE_PER_PAIR = 150;
    const BUSINESS_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/la-hotdogeria.appspot.com/o/logo.png?alt=media&token=c6c572b6-2092-411a-8e2b-232145396557";
    const BUSINESS_DAY_START_HOUR = 14;
    const HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION = ["hot dog", "hotdog", "perro caliente"];
    const TEAM_HOTDOG_COMMISSION_AMOUNT = 1.00;

    const CHART_COLORS = [
        'rgb(255, 87, 34)', 'rgb(33, 150, 243)', 'rgb(76, 175, 80)', 'rgb(255, 193, 7)',
        'rgb(156, 39, 176)', 'rgb(0, 188, 212)', 'rgb(233, 30, 99)', 'rgb(121, 85, 72)'
    ];

    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = 'Roboto, sans-serif';
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-primary').trim();
    }

    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBo1RT0XiSDoyiLrA_u17NOTl3bcWrR-Cs",
        authDomain: "la-hotdogeria.firebaseapp.com",
        projectId: "la-hotdogeria",
        storageBucket: "la-hotdogeria.appspot.com",
        messagingSenderId: "465067721595",
        appId: "1:465067721595:web:686b61dd83badc8d29b3de"
    };

    let db;
    let auth;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase inicializado.");
        } else {
            firebase.app();
            console.log("Firebase ya inicializado.");
        }
        db = firebase.firestore();
        auth = firebase.auth();
        db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log("¡Persistencia de Firestore HABILITADA! La aplicación funcionará offline.");
            })
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn("La persistencia falló, probablemente por múltiples pestañas abiertas. Ya debería estar activa en otra pestaña.");
                } else if (err.code == 'unimplemented') {
                    console.error("El navegador actual no soporta la persistencia offline de Firestore.");
                }
            });

        console.log("Instancias de Firebase Firestore y Auth obtenidas.");

    } catch (error) {
        console.error("Error crítico al inicializar Firebase:", error);
        alert("Error crítico: No se pudo conectar a Firebase. La aplicación no puede funcionar.");
        db = null;
        auth = null;
    }
        // =========================================================================
    // Bloque de DECLARACIÓN DE VARIABLES DE ESTADO GLOBALES
    // =========================================================================
    let cashRegisterOpen = false;
    let currentShiftId = null;
    let currentShiftStartTime = null;
    let currentShiftInitialCash = 0;
    let currentShiftCashChange = 0;
    let currentUser = null;
    let productsCache = [];
    let cart = [];
    let cartDiscountType = 'none';
    let cartDiscountValue = 0;
    let cartDiscountAmount = 0;
    let editingProductId = null;
    let editingUserId = null;
    let editingCartItemId = null;
    let adminActionCallback = null;
    let confirmActionCallback = null;
    let selectedUserForCashbox = null; // Para que el admin seleccione un usuario
    let currentReportData = null;
    let currentInvoiceId = null;
    let _lastProcessedSaleId = null;
    let currentShiftTeamMembers = [];
    let currentShiftName = '';
    let currentCreditCustomer = null;
    let accountsReceivableChart = null;
    let salesByCategoryChartInstance = null;
    let paymentMethodsChartInstance = null;
    let salesTrendChartInstance = null;
    let commissionStackedBarChartInstance = null;
    let unsubscribeShiftListener = null;

    // =========================================================================
    // INICIO DEL BLOQUE DE FUNCIONES DE UTILIDAD Y UI
    // =========================================================================

    const applyTheme = (theme) => {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
            if (mainAppUI.themeToggleButton) {
                mainAppUI.themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
                mainAppUI.themeToggleButton.setAttribute("aria-label", "Cambiar a tema claro");
            }
        } else {
            document.body.classList.remove("dark-mode");
            if (mainAppUI.themeToggleButton) {
                mainAppUI.themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
                mainAppUI.themeToggleButton.setAttribute("aria-label", "Cambiar a tema oscuro");
            }
        }
        localStorage.setItem("appTheme", theme);
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-primary').trim();
            if (salesByCategoryChartInstance) salesByCategoryChartInstance.update();
            if (paymentMethodsChartInstance) paymentMethodsChartInstance.update();
            if (salesTrendChartInstance) salesTrendChartInstance.update();
            if (commissionStackedBarChartInstance) commissionStackedBarChartInstance.update();
            if (accountsReceivableChart) accountsReceivableChart.update();
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    };

    const updateUIVisibilityBasedOnRole = () => {
        const isAdmin = currentUser && currentUser.role === "admin";
        console.log("Updating UI based on role:", currentUser?.role);

        document.querySelector('.nav-list li a[data-section="usuarios"]')?.parentElement.classList.toggle("hidden", !isAdmin);
        document.querySelector('.nav-list li a[data-section="admin-reports"]')?.parentElement.classList.toggle("hidden", !isAdmin);
        
        if (cuadreCajaUI.adminOpenCashBtn) {
            cuadreCajaUI.adminOpenCashBtn.classList.toggle("hidden", !isAdmin);
        }

        if (mainAppUI.setTeamMembersButton) {
            mainAppUI.setTeamMembersButton.classList.toggle('hidden', !currentUser?.isTeamAccount);
        }

        if (inventarioUI.addProductButton) {
            inventarioUI.addProductButton.classList.toggle('hidden', !isAdmin);
        }

        if (usuariosUI.addUserButton) {
            usuariosUI.addUserButton.classList.toggle('hidden', !isAdmin);
        }
        mainAppUI.discountNavLink.parentElement.classList.toggle("hidden", !isAdmin);

        if (cuadreCajaUI.printReportButton) {
            cuadreCajaUI.printReportButton.classList.toggle("hidden", !(currentReportData && (isAdmin || currentUser.isTeamAccount)));
        }
        if (adminReportsUI.printAdminReportButton) {
            adminReportsUI.printAdminReportButton.classList.toggle("hidden", !(currentReportData && isAdmin));
        }

        if (modals.invoicePreview?.element && !modals.invoicePreview.element.classList.contains("hidden")) {
            modals.invoicePreview.deleteButton?.classList.toggle("hidden", !isAdmin);
            modals.invoicePreview.modifyButton?.classList.remove("hidden");
            if (!currentInvoiceId) {
                modals.invoicePreview.modifyButton?.classList.add("hidden");
            }
        }
    };

    /**
     * Genera un PDF a partir del contenido HTML de la factura y lo descarga.
     * @param {string} invoiceId - El ID de la venta para nombrar el archivo.
     */
    const downloadInvoiceAsPDF = async (invoiceId) => {
        if (!db || !currentUser) {
            showToast("La aplicación no está lista. Intenta de nuevo.", "error");
            return;
        }
        if (!invoiceId) {
            showToast("ID de factura no válido para generar PDF.", "error");
            return;
        }

        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            showToast("Las librerías para generar PDF no están cargadas.", "error");
            console.error("html2canvas or jspdf is not defined.");
            return;
        }

        showToast("Generando PDF...", "info");

        try {
            const saleDoc = await db.collection('sales').doc(invoiceId).get();
            if (!saleDoc.exists) {
                showToast("La factura no fue encontrada.", "error");
                return;
            }

            const saleData = { id: saleDoc.id, ...saleDoc.data() };
            const isAdmin = currentUser && currentUser.role === "admin";
            const invoiceText = generateInvoiceHTML(saleData, true, isAdmin);

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.fontFamily = 'monospace';
            tempContainer.style.fontSize = '12px';
            tempContainer.style.lineHeight = '1.3';
            tempContainer.style.whiteSpace = 'pre';
            tempContainer.style.padding = '20px';
            tempContainer.style.border = '1px solid black';
            tempContainer.style.width = '302px';
            tempContainer.style.background = 'white';
            tempContainer.style.color = 'black';
            tempContainer.textContent = invoiceText;
            document.body.appendChild(tempContainer);

            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            document.body.removeChild(tempContainer);

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;

            const pdfWidth = 80;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const fileName = `Factura-${invoiceId.substring(0, 8)}.pdf`;
            pdf.save(fileName);

            showToast("Descarga de PDF iniciada.", "success");

        } catch (error) {
            console.error("Error generando el PDF de la factura:", error);
            showToast("Error al generar el PDF. Revisa la consola.", "error");
        }
    };
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
        /**
     * Monitorea el estado de la conexión a internet y actualiza el indicador en la UI.
     * Muestra notificaciones solo cuando el estado cambia, no en la carga inicial.
     */
    const monitorConnectionStatus = () => {
        const statusElement = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-status-text');
        const statusIcon = statusElement?.querySelector('i');

        if (!statusElement || !statusText || !statusIcon) return;

        const updateUI = (isOnline) => {
            if (isOnline) {
                statusElement.classList.remove('offline');
                statusElement.classList.add('online');
                statusIcon.className = 'fas fa-wifi';
                statusText.textContent = 'En Línea';
            } else {
                statusElement.classList.remove('online');
                statusElement.classList.add('offline');
                statusIcon.className = 'fas fa-triangle-exclamation';
                statusText.textContent = 'Offline';
            }
        };

        updateUI(navigator.onLine);

        window.addEventListener('online', () => {
            updateUI(true);
            showToast("Conexión a internet restaurada. Sincronizando datos...", "success");
        });

        window.addEventListener('offline', () => {
            updateUI(false);
            showToast("Sin conexión a internet. Trabajando en modo local.", "warning", 5000);
        });
    };

    const showToast = (message, type = "info", duration = 3000) => {
        const toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            console.error("Toast container not found.");
            alert(message);
            return;
        }

        const toast = document.createElement("div");
        toast.classList.add("toast", type);

        let iconClass = '';
        switch (type) {
            case 'success':
                iconClass = 'fa-solid fa-circle-check';
                break;
            case 'error':
                iconClass = 'fa-solid fa-circle-xmark';
                break;
            case 'warning':
                iconClass = 'fa-solid fa-triangle-exclamation';
                break;
            case 'info':
            default:
                iconClass = 'fa-solid fa-circle-info';
                break;
        }
        toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);

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
    };

    /**
     * Calculates the start and end timestamps for a business day, considering a night shift.
     * @param {string} startDateStr - The date string (YYYY-MM-DD) for the start of the business day.
     * @param {string} endDateStr - The date string (YYYY-MM-DD) for the end of the business day.
     * @returns {{start: firebase.firestore.Timestamp, end: firebase.firestore.Timestamp}}
     */
    const getBusinessDateRange = (startDateStr, endDateStr) => {
        const startCalendarDate = new Date(startDateStr);
        const endCalendarDate = new Date(endDateStr);

        const startBusinessDateTime = new Date(startCalendarDate);
        startBusinessDateTime.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);

        const endBusinessDateTime = new Date(endCalendarDate);
        endBusinessDateTime.setDate(endBusinessDateTime.getDate() + 1);
        endBusinessDateTime.setHours(BUSINESS_DAY_START_HOUR - 1, 59, 59, 999);

        console.log("Calculated business date range:");
        console.log("Start (Local):", startBusinessDateTime.toLocaleString());
        console.log("End (Local):", endBusinessDateTime.toLocaleString());

        return {
            start: firebase.firestore.Timestamp.fromDate(startBusinessDateTime),
            end: firebase.firestore.Timestamp.fromDate(endBusinessDateTime)
        };
    };
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
        currentCreditCustomer = null;
        _lastProcessedSaleId = null;
        selectedUserForCashbox = null; // Resetear usuario seleccionado por admin

        if (modals.adminOpenCashbox?.element) {
            if (modals.adminOpenCashbox.userSelect) modals.adminOpenCashbox.userSelect.value = '';
            if (modals.adminOpenCashbox.initialCashInput) modals.adminOpenCashbox.initialCashInput.value = '0.00';
            if (modals.adminOpenCashbox.cashChangeInput) modals.adminOpenCashbox.cashChangeInput.value = '0.00';
            if (modals.adminOpenCashbox.confirmButton) modals.adminOpenCashbox.confirmButton.disabled = false;
        }

        if (modals.creditAccount?.element) {
            if (modals.creditAccount.customerSearchInput) modals.creditAccount.customerSearchInput.value = '';
            if (modals.creditAccount.customerResultsList) modals.creditAccount.customerResultsList.innerHTML = '';
            if (modals.creditAccount.customerNameInput) modals.creditAccount.customerNameInput.value = '';
            if (modals.creditAccount.customerContactInput) modals.creditAccount.customerContactInput.value = '';
            if (modals.creditAccount.customerIdDisplay) modals.creditAccount.customerIdDisplay.value = '';
            if (modals.creditAccount.creditCartItemsList) modals.creditAccount.creditCartItemsList.innerHTML = '';
        }

        if (modals.recordPayment?.element) {
            if (modals.recordPayment.customerNameDisplay) modals.recordPayment.customerNameDisplay.textContent = '';
            if (modals.recordPayment.totalDueDisplay) modals.recordPayment.totalDueDisplay.textContent = formatPrice(0);
            if (modals.recordPayment.balanceDisplay) modals.recordPayment.balanceDisplay.textContent = formatPrice(0);
            if (modals.recordPayment.amountInput) modals.recordPayment.amountInput.value = '';
            if (modals.recordPayment.descriptionInput) modals.recordPayment.descriptionInput.value = '';
            if (modals.recordPayment.confirmButton) modals.recordPayment.confirmButton.disabled = false;
        }

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
            if (modals.product.costInput) modals.product.costInput.value = "";
            if (modals.product.stockInput) modals.product.stockInput.value = "";
            if (modals.product.categoryInput) modals.product.categoryInput.value = "";
            if (modals.product.boxPriceInput) modals.product.boxPriceInput.value = "";
            if (modals.product.boxUnitsInput) modals.product.boxUnitsInput.value = "";

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
            if (modals.user.emailInput) modals.user.emailInput.value = "";
            if (modals.user.idInput) modals.user.idInput.value = "";
            if (modals.user.passwordInput) modals.user.passwordInput.value = "";
            if (modals.user.roleSelect) modals.user.roleSelect.value = "colaborator";
            if (modals.user.generalCommissionEnabledCheckbox)
                modals.user.generalCommissionEnabledCheckbox.checked = false;
            if (modals.user.generalCommissionAmountInput)
                modals.user.generalCommissionAmountInput.value = "";
            if (modals.user.generalCommissionAmountGroup?.closest(".form-group"))
                modals.user.generalCommissionAmountGroup
                .classList.add("hidden");
            if (modals.user.hotdogCommissionEnabledCheckbox)
                modals.user.hotdogCommissionEnabledCheckbox.checked = false;
            if (modals.user.hotdogCommissionPerItemInput)
                modals.user.hotdogCommissionPerItemInput.value = "";
            if (modals.user.hotdogCommissionAmountGroup)
                modals.user.hotdogCommissionAmountGroup.classList.add("hidden");
            if (modals.user.isTeamAccountCheckbox)
                modals.user.isTeamAccountCheckbox.checked = false;

            if (modals.user.idInput) modals.user.idInput.disabled = false;
            if (modals.user.emailInput) modals.user.emailInput.disabled = false;
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
            if (modals.invoicePreview.modifyButton)
                modals.invoicePreview.modifyButton.disabled = false;
        }
        if (modals.inventoryMovement?.element) {
            if (modals.inventoryMovement.productSelect) modals.inventoryMovement.productSelect.value = '';
            if (modals.inventoryMovement.typeSelect) modals.inventoryMovement.typeSelect.value = 'in';
            if (modals.inventoryMovement.quantityInput) modals.inventoryMovement.quantityInput.value = '';
            if (modals.inventoryMovement.descriptionInput) modals.inventoryMovement.descriptionInput.value = '';
            if (modals.inventoryMovement.saveButton) modals.inventoryMovement.saveButton.disabled = false;
            if (modals.inventoryMovement.saveButton) modals.inventoryMovement.saveButton.textContent = 'Registrar Movimiento';
        }
        if (modals.setTeamMembers?.element) {
            if (modals.setTeamMembers.shiftNameInput) modals.setTeamMembers.shiftNameInput.value = '';
            if (modals.setTeamMembers.teamMembersList) modals.setTeamMembers.teamMembersList.innerHTML = '';
            if (modals.setTeamMembers.printButton) modals.setTeamMembers.printButton.disabled = false;
            modals.setTeamMembers.saveButton.disabled = false;
            modals.setTeamMembers.saveButton.textContent = 'Guardar';
        }
        if (modals.cashBalanceDisplay?.element) {
            if (modals.cashBalanceDisplay.content) modals.cashBalanceDisplay.content.innerHTML = '';
            if (modals.cashBalanceDisplay.confirmButton) modals.cashBalanceDisplay.confirmButton.disabled = false;
            if (modals.cashBalanceDisplay.confirmButton) modals.cashBalanceDisplay.confirmButton.onclick = null;
        }
        if (modals.customerName?.element) {
            if (modals.customerName.input) modals.customerName.input.value = '';
        }
        if (modals.postSaleOptions?.element) {
            if (modals.postSaleOptions.downloadButton) modals.postSaleOptions.downloadButton.onclick = null;
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

        if (modalObj === modals.adminOpenCashbox) {
            loadUsersForAdminCashbox();
        } else if (modalObj === modals.adminCode && args.length >= 2) {
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
            if (modalObj.message) modalObj.message.innerHTML = args[1];
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
            modalObj.costInput.value = product?.costPrice || '';
            modalObj.stockInput.value = product?.stock || '';
            modalObj.categoryInput.value = product?.category || '';

            const isAdmin = currentUser && currentUser.role === "admin";
            modalObj.nameInput.disabled = !isAdmin && mode === 'edit';
            modalObj.codeInput.disabled = !isAdmin || mode === 'edit';
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
            modalObj.emailInput.value = user?.email || '';
            modalObj.idInput.value = user?.uid || '';
            modalObj.passwordInput.value = '';

            modalObj.roleSelect.value = user?.role || 'colaborator';
            modalObj.roleSelect.disabled = (editingUserId === currentUser.uid);

            modalObj.generalCommissionEnabledCheckbox.checked = user?.generalCommissionEnabled || false;
            modalObj.generalCommissionAmountInput.value = user?.generalCommissionAmount || '';
            modalObj.generalCommissionAmountGroup.classList.toggle('hidden', !modalObj.generalCommissionEnabledCheckbox.checked);
            modalObj.generalCommissionEnabledCheckbox.onchange = () => {
                modalObj.generalCommissionAmountGroup.classList.toggle('hidden', !modalObj.generalCommissionEnabledCheckbox.checked);
                if (modalObj.generalCommissionEnabledCheckbox.checked) {
                    modalObj.generalCommissionAmountInput.focus();
                }
            };
            modalObj.hotdogCommissionEnabledCheckbox.checked = user?.hotdogCommissionEnabled || false;
            modalObj.hotdogCommissionPerItemInput.value = user?.hotdogCommissionPerItem || '';
            modalObj.hotdogCommissionAmountGroup.classList.toggle('hidden', !modalObj.hotdogCommissionEnabledCheckbox.checked);
            modalObj.hotdogCommissionEnabledCheckbox.onchange = () => {
                modalObj.hotdogCommissionAmountGroup.classList.toggle('hidden', !modalObj.hotdogCommissionEnabledCheckbox.checked);
                if (modalObj.hotdogCommissionEnabledCheckbox.checked) {
                    modalObj.hotdogCommissionPerItemInput.focus();
                }
            };
            modalObj.isTeamAccountCheckbox.checked = user?.isTeamAccount || false;

            modalObj.idInput.disabled = mode === 'edit';
            modalObj.emailInput.disabled = false;
            modalObj.usernameInput.disabled = false;
            modalObj.saveButton.disabled = false;
            setTimeout(() => modalObj.nameInput.focus(), 100);

        } else if (modalObj === modals.invoicePreview && args.length >= 2) {
            const invoiceHtml = args[0];
            const invoiceId = args[1]; // Usamos una variable local
            currentInvoiceId = invoiceId; // También asignamos a la global por si se necesita

            if (modalObj.content) modalObj.content.innerHTML = invoiceHtml;

            const isAdmin = currentUser && currentUser.role === "admin";
            
            if (modalObj.deleteButton) {
                modalObj.deleteButton.classList.toggle("hidden", !isAdmin || !invoiceId);
                const newDeleteButton = modalObj.deleteButton.cloneNode(true);
                modalObj.deleteButton.parentNode.replaceChild(newDeleteButton, modalObj.deleteButton);
                modals.invoicePreview.deleteButton = newDeleteButton;
                if (isAdmin && invoiceId) {
                    newDeleteButton.addEventListener("click", () => handleAnnulInvoice(invoiceId));
                }
            }

            if (modalObj.modifyButton) {
                modalObj.modifyButton.classList.toggle("hidden", !invoiceId);
                const newModifyButton = modalObj.modifyButton.cloneNode(true);
                modalObj.modifyButton.parentNode.replaceChild(newModifyButton, modalObj.modifyButton);
                modals.invoicePreview.modifyButton = newModifyButton;
                if(invoiceId) {
                    newModifyButton.addEventListener("click", () => handleModifyInvoice(invoiceId));
                }
            }

            if (modalObj.downloadButton) {
                const newDownloadButton = modalObj.downloadButton.cloneNode(true);
                modalObj.downloadButton.parentNode.replaceChild(newDownloadButton, modalObj.downloadButton);
                modals.invoicePreview.downloadButton = newDownloadButton;
                if(invoiceId) {
                    newDownloadButton.addEventListener('click', () => downloadInvoiceAsPDF(invoiceId));
                }
            }

        } else if (modalObj === modals.invoicePreview && args.length >= 1) {
            if (modalObj.content) modalObj.content.innerHTML = args[0];
            currentInvoiceId = null;
            console.warn("Invoice modal shown without invoice ID.");
            modalObj.deleteButton?.classList.add("hidden");
            modalObj.modifyButton?.classList.add("hidden");
        } else if (modalObj === modals.editCartItem && args.length >= 1) {
            const cartItem = args[0];
            editingCartItemId = cartItem?.id || null;
            if (!editingCartItemId) {
                console.error("Attempted to open edit cart item modal without a valid item:", cartItem);
                showAlert("Error interno: Información del item incompleta.", "error");
                return;
            }

            const productInCache = productsCache.find((p) => p.id === editingCartItemId);
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
        } else if (modalObj === modals.setTeamMembers) {
            if (modals.setTeamMembers.shiftNameInput) {
                modals.setTeamMembers.shiftNameInput.value = currentShiftName;
            }
            if (modals.setTeamMembers.teamMembersList) {
                modals.setTeamMembers.teamMembersList.innerHTML = '<p class="placeholder-text">Cargando usuarios...</p>';
                loadUsersForTeamSelection();
            }
            if (modals.setTeamMembers.printButton) modals.setTeamMembers.printButton.disabled = false;
            modals.setTeamMembers.saveButton.disabled = false;
            modals.setTeamMembers.saveButton.textContent = 'Guardar';
        } else if (modalObj === modals.cashBalanceDisplay) {
            if (modalObj.title) modalObj.title.textContent = args[0];
            if (modalObj.content) modalObj.content.innerHTML = args[1];
            if (modalObj.confirmButton) {
                modalObj.confirmButton.onclick = args[2];
                modalObj.confirmButton.disabled = false;
            }
            const realCashInput = modalObj.element.querySelector('#realCashCount');
            if (realCashInput) {
                setTimeout(() => realCashInput.focus(), 100);
            }
        } else if (modalObj === modals.creditAccount) {
            const totalSaleAmount = args[0] || 0;
            if (modals.creditAccount.creditCartTotalDisplay) modals.creditAccount.creditCartTotalDisplay.textContent = formatPrice(totalSaleAmount);
            if (modals.creditAccount.creditCartItemsList) {
                modals.creditAccount.creditCartItemsList.innerHTML = '';
                cart.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `${item.quantity}x ${item.name} (${formatPrice(item.price)})`;
                    modals.creditAccount.creditCartItemsList.appendChild(li);
                });
            }
            if (modals.creditAccount.customerSearchInput) {
                modals.creditAccount.customerSearchInput.value = '';
                modals.creditAccount.customerSearchInput.focus();
            }
            if (modals.creditAccount.customerResultsList) modals.creditAccount.customerResultsList.innerHTML = '';
            if (modals.creditAccount.customerNameInput) modals.creditAccount.customerNameInput.value = '';
            if (modals.creditAccount.customerContactInput) modals.creditAccount.customerContactInput.value = '';
            if (modals.creditAccount.customerIdDisplay) modals.creditAccount.customerIdDisplay.value = '';

            loadCustomersForCreditSelection();
        } else if (modalObj === modals.recordPayment && args.length >= 1) {
            const customer = args[0];
            if (modalObj.customerNameDisplay) modalObj.customerNameDisplay.textContent = customer.customerName || 'N/A';
            if (modalObj.totalDueDisplay) modalObj.totalDueDisplay.textContent = formatPrice(customer.totalDue);
            if (modalObj.balanceDisplay) modalObj.balanceDisplay.textContent = formatPrice(customer.balance);
            if (modalObj.amountInput) modalObj.amountInput.value = customer.balance > 0 ? customer.balance.toFixed(2) : '0.00';
            if (modalObj.descriptionInput) modalObj.descriptionInput.value = 'Pago de deuda';

            modalObj.customerId = customer.id;
            modalObj.customerBalance = customer.balance;

            if (modalObj.amountInput) setTimeout(() => modalObj.amountInput.focus(), 100);
        } else if (modalObj === modals.customerName) {
            if (modalObj.input) {
                modalObj.input.value = '';
                setTimeout(() => modalObj.input.focus(), 100);
            }
        } else if (modalObj === modals.postSaleOptions && args.length >= 1) {
            _lastProcessedSaleId = args[0];
            if (modalObj.downloadButton) {
                modalObj.downloadButton.onclick = () => {
                    if (_lastProcessedSaleId) {
                        downloadInvoiceAsPDF(_lastProcessedSaleId);
                    }
                };
            }
        }

        modalObj.element.classList.remove("hidden");
    };
        const updateCashTotals = () => {
        const cashChange = parseFloat(cuadreCajaUI.cashChangeInput.value) || 0;
        const initialCash = parseFloat(cuadreCajaUI.initialCashInput.value) || 0;
        if (cuadreCajaUI.cashEntriesTotal) {
            cuadreCajaUI.cashEntriesTotal.textContent = formatPrice(cashChange + initialCash);
        }
    }

    const clearCashDashboardUI = (esPorFaltaDePermisos = false) => {
        // Limpia todos los valores numéricos del dashboard.
        if (cuadreCajaUI.cashSalesAmount) cuadreCajaUI.cashSalesAmount.textContent = formatPrice(0);
        if (cuadreCajaUI.totalEntries) cuadreCajaUI.totalEntries.textContent = formatPrice(0);
        if (cuadreCajaUI.supplierPayments) cuadreCajaUI.supplierPayments.textContent = formatPrice(0);
        if (cuadreCajaUI.currentEstimatedCashInHandDisplay) cuadreCajaUI.currentEstimatedCashInHandDisplay.textContent = formatPrice(0);
        if (cuadreCajaUI.currentCashTotal) cuadreCajaUI.currentCashTotal.textContent = formatPrice(0);
        if (cuadreCajaUI.cashPayments) cuadreCajaUI.cashPayments.textContent = formatPrice(0);
        if (cuadreCajaUI.cardPayments) cuadreCajaUI.cardPayments.textContent = formatPrice(0);
        if (cuadreCajaUI.totalPayments) cuadreCajaUI.totalPayments.textContent = formatPrice(0);
        if (cuadreCajaUI.totalDepartmentSales) cuadreCajaUI.totalDepartmentSales.textContent = formatPrice(0);

        // Destruye las instancias de los gráficos si existen para liberar memoria.
        if (salesByCategoryChartInstance) {
            salesByCategoryChartInstance.destroy();
            salesByCategoryChartInstance = null;
        }
        if (paymentMethodsChartInstance) {
            paymentMethodsChartInstance.destroy();
            paymentMethodsChartInstance = null;
        }

        // Define qué mensaje mostrar en el lugar de los gráficos.
        const isAdmin = currentUser && currentUser.role === 'admin';
        const placeholderMessage = esPorFaltaDePermisos && !isAdmin
            ? '<p class="placeholder-text">Datos del dashboard disponibles solo para Administradores.</p>'
            : '<p class="placeholder-text">Abra la caja para ver los totales del turno.</p>';

        // Inserta el mensaje en los contenedores de los gráficos.
        if (cuadreCajaUI.departmentSalesChartContainer) {
            cuadreCajaUI.departmentSalesChartContainer.innerHTML = placeholderMessage;
        }
        if (cuadreCajaUI.paymentMethodsChartContainer) {
            cuadreCajaUI.paymentMethodsChartContainer.innerHTML = placeholderMessage;
        }

        // Limpia el resto de la UI de reportes.
        if (cuadreCajaUI.initialCashInput) cuadreCajaUI.initialCashInput.value = '0.00';
        if (cuadreCajaUI.cashChangeInput) cuadreCajaUI.cashChangeInput.value = '0.00';
        updateCashTotals();
        if (cuadreCajaUI.reportDetailsContainer) {
            cuadreCajaUI.reportDetailsContainer.innerHTML = '<p class="placeholder-text">Selecciona un rango de fechas para generar el reporte o busca una factura por ID.</p>';
        }
        if (cuadreCajaUI.printReportButton) cuadreCajaUI.printReportButton.classList.add("hidden");
    };


    const updateCashRegisterUIState = () => {
        if (!cuadreCajaUI.openCashBtn || !cuadreCajaUI.cashBalanceBtn || !cuadreCajaUI.closeCashBtn ||
            !cartUI.processSaleButton || !salidaEntradaUI.addPettyCashButton || !salidaEntradaUI.recordButton ||
            !inventarioUI.openInventoryMovementModalButton || !ventasUI.productsGrid || !ventasUI.salesSectionPlaceholder) {
            console.warn("UI elements for cash register state not fully available yet.");
            return;
        }

        cuadreCajaUI.openCashBtn.classList.toggle('hidden', cashRegisterOpen);
        cuadreCajaUI.cashBalanceBtn.classList.toggle('hidden', !cashRegisterOpen);
        cuadreCajaUI.closeCashBtn.classList.toggle('hidden', !cashRegisterOpen);
        cuadreCajaUI.initialCashInput.disabled = cashRegisterOpen;
        cuadreCajaUI.cashChangeInput.disabled = cashRegisterOpen;

        const isAdmin = currentUser && currentUser.role === 'admin';
        // El admin siempre puede ver el botón de abrir caja para otros.
        if (cuadreCajaUI.adminOpenCashBtn) {
            cuadreCajaUI.adminOpenCashBtn.classList.toggle('hidden', !isAdmin);
        }

        const enableOperations = cashRegisterOpen;
        cartUI.processSaleButton.disabled = !enableOperations;
        salidaEntradaUI.addPettyCashButton.disabled = !enableOperations;
        salidaEntradaUI.recordButton.disabled = !enableOperations;
        inventarioUI.openInventoryMovementModalButton.disabled = !enableOperations;

        if (enableOperations) {
            ventasUI.salesSectionPlaceholder.classList.add('hidden');
            ventasUI.productsGrid.classList.remove('hidden');
            if (document.getElementById('ventas-section').classList.contains('active')) {
                loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect?.value);
            }
        } else {
            ventasUI.salesSectionPlaceholder.classList.remove('hidden');
            ventasUI.productsGrid.classList.add('hidden');
            ventasUI.productsGrid.innerHTML = '';
            clearCashDashboardUI();
            cart = [];
            updateCartUI();
        }
        if (cashRegisterOpen) {
            updateCashDashboardTotals();
        }
    }
        const updateCashBalanceDifferenceDisplay = (realCashInput, expectedTotal) => {
        const currentRealCash = parseFloat(realCashInput.value) || 0;
        const currentDifference = currentRealCash - expectedTotal;
        const differenceDisplay = modals.cashBalanceDisplay.element.querySelector('#cash-balance-difference-display');
        if (differenceDisplay) {
            let diffColor = 'var(--text-primary)';
            let diffSign = '';
            if (currentDifference > 0) {
                diffColor = 'var(--bg-success)';
                diffSign = '+';
            } else if (currentDifference < 0) {
                diffColor = 'var(--bg-danger)';
            }
            differenceDisplay.style.color = diffColor;
            differenceDisplay.textContent = `${diffSign}${formatPrice(Math.abs(currentDifference))}`;
        }
    }

    // =========================================================================
    // INICIO DEL BLOQUE DE FUNCIONES DE LÓGICA DE NEGOCIO
    // =========================================================================

    /**
     * @param {string} userId El UID del usuario para quien se abre la caja.
     * @param {string} userName El nombre del usuario.
     * @param {number} initialCash El efectivo inicial.
     * @param {number} cashChange El cambio.
     */
    const _performOpenCash = async (userId, userName, initialCash, cashChange) => {
        const isAdminOpeningForOther = currentUser.role === 'admin' && currentUser.uid !== userId;

        const buttonToDisable = isAdminOpeningForOther 
            ? modals.adminOpenCashbox.confirmButton 
            : cuadreCajaUI.openCashBtn;
        
        if (!buttonToDisable) {
            showAlert("Error: No se encontró el botón de acción.", "error");
            return;
        }

        buttonToDisable.disabled = true;
        buttonToDisable.textContent = 'Abriendo...';

        try {
            // Verificar si el usuario ya tiene una caja abierta
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().isCashRegisterOpen) {
                showAlert(`El usuario ${userName} ya tiene una caja abierta. Cierra la caja actual primero.`, "error");
                buttonToDisable.disabled = false;
                buttonToDisable.textContent = isAdminOpeningForOther ? 'Confirmar Apertura' : 'Abrir Caja';
                return;
            }

            const shiftDocRef = db.collection('shifts').doc();
            const shiftId = shiftDocRef.id;

            const shiftData = {
                type: 'start_shift',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: userId,
                userName: userName || 'Desconocido',
                initialCash: initialCash,
                cashChange: cashChange,
                shiftName: `Turno de ${userName}`,
                shiftTeamMembers: [], // Los equipos se definen por cuenta, no por apertura de admin
                openedByAdmin: isAdminOpeningForOther ? currentUser.uid : null
            };

            await shiftDocRef.set(shiftData);

            await db.collection('users').doc(userId).update({
                isCashRegisterOpen: true,
                currentShiftId: shiftId,
                lastActivityAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Si el usuario actual es el que abre la caja para sí mismo
            if (currentUser.uid === userId) {
                cashRegisterOpen = true;
                currentShiftId = shiftId;
                currentShiftStartTime = new Date();
                currentShiftInitialCash = initialCash;
                currentShiftCashChange = cashChange;
                updateCashRegisterUIState();
                updateCashDashboardTotals();
            }

            showToast(`Caja abierta para ${userName} con éxito.`, "success");
            hideAllModals();

        } catch (error) {
            console.error("Error abriendo caja:", error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos al abrir caja. Contacta al administrador sobre las reglas de seguridad de Firestore.", "error");
            } else {
                showAlert("Error al abrir caja. Intenta de nuevo.", "error");
            }
        } finally {
            buttonToDisable.disabled = false;
            buttonToDisable.textContent = isAdminOpeningForOther ? 'Confirmar Apertura' : 'Abrir Caja';
        }
    };

  const loadCurrentShiftState = async () => {
        if (!db || !currentUser) {
            console.error("DB o currentUser no disponibles para cargar el estado del turno.");
            return;
        }

        // Si ya hay un listener, lo desconectamos antes de crear uno nuevo.
        if (unsubscribeShiftListener) {
            unsubscribeShiftListener();
        }

        try {
            const userDocRef = db.collection('users').doc(currentUser.uid);
            // Guardamos la función de desuscripción que nos devuelve onSnapshot
            unsubscribeShiftListener = userDocRef.onSnapshot(async (userDoc) => {
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.isCashRegisterOpen && userData.currentShiftId) {
                        const shiftDocRef = db.collection('shifts').doc(userData.currentShiftId);
                        const shiftDoc = await shiftDocRef.get();

                        if (shiftDoc.exists && shiftDoc.data().type === 'start_shift') {
                            const shiftData = shiftDoc.data();
                            cashRegisterOpen = true;
                            currentShiftId = shiftDoc.id;
                            currentShiftStartTime = shiftData.timestamp?.toDate ? shiftData.timestamp.toDate() : new Date();
                            currentShiftInitialCash = shiftData.initialCash || 0;
                            currentShiftCashChange = shiftData.cashChange || 0;
                            currentShiftName = shiftData.shiftName || '';
                            currentShiftTeamMembers = shiftData.shiftTeamMembers || [];

                            if (cuadreCajaUI.initialCashInput) cuadreCajaUI.initialCashInput.value = currentShiftInitialCash.toFixed(2);
                            if (cuadreCajaUI.cashChangeInput) cuadreCajaUI.cashChangeInput.value = currentShiftCashChange.toFixed(2);

                            showToast(`Caja abierta (turno recuperado por ${shiftData.userName}).`, "info");
                        } else {
                            console.warn("Shift ID in user metadata is invalid or missing 'start_shift' document. Resetting cash register state locally.");
                             if (cashRegisterOpen) {
                                await userDocRef.update({
                                    isCashRegisterOpen: false,
                                    currentShiftId: null
                                }).catch(console.error);
                                showToast("Turno inconsistente. La caja ha sido cerrada.", "warning");
                            }
                            cashRegisterOpen = false;
                            currentShiftId = null;
                        }
                    } else {
                        if (cashRegisterOpen) {
                           showToast("Caja cerrada remotamente.", "info");
                        }
                        cashRegisterOpen = false;
                        currentShiftId = null;
                    }
                } else {
                    console.warn("User document not found for cash register state. Assuming closed.");
                    cashRegisterOpen = false;
                    currentShiftId = null;
                }
                updateCashRegisterUIState();
                updateCashTotals();

            }, (error) => {
                console.error("Error con el listener del estado de caja:", error);
                showAlert("Error de conexión al monitorear estado de caja.", "error");
            });

        } catch (error) {
            console.error("Error setting up listener for current shift state:", error);
            showAlert("Error al cargar el estado de la caja. Contacta al administrador.", "error");
            cashRegisterOpen = false;
            currentShiftId = null;
        }
    };
        const _performRecordCashMovement = async (type, description, amount) => {
        if (!db || !currentUser) {
            showAlert("Base de datos o usuario no disponible. Intenta recargar.", "error");
            return;
        }

        const movementData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: type,
            description: description,
            amount: amount,
            recordedBy: {
                id: currentUser.uid,
                name: currentUser.username || currentUser.name || "Desconocido"
            },
            shiftId: currentShiftId,
            shiftName: currentShiftName || null,
        };

        const buttonToDisable = type === 'addition' ? salidaEntradaUI.addPettyCashButton : salidaEntradaUI.recordButton;
        buttonToDisable.disabled = true;

        try {
            await db.collection('cashMovements').add(movementData);
            const message = type === 'addition' ? "Entrada de efectivo registrada con éxito." : "Salida de efectivo registrada con éxito.";
            showToast(message, "success");

            if (type === 'addition') {
                salidaEntradaUI.addPettyCashDescriptionInput.value = '';
                salidaEntradaUI.addPettyCashAmountInput.value = '';
            } else {
                salidaEntradaUI.outputDescriptionInput.value = '';
                salidaEntradaUI.outputAmountInput.value = '';
            }

            renderRecentCashMovements();
            updateCashDashboardTotals();

        } catch (error) {
            console.error("Error registrando movimiento de caja:", error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert('Error de permisos. Revisa tus Security Rules.', "error");
            } else {
                showAlert("Error al registrar el movimiento. Intenta de nuevo.", "error");
            }
        } finally {
            buttonToDisable.disabled = false;
        }
    };
    const resetSaleAfterCompletion = () => {
        cart = [];
        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        if (cartUI.amountReceivedInput) cartUI.amountReceivedInput.value = '';
        if (cartUI.paymentMethodSelect) cartUI.paymentMethodSelect.value = 'efectivo';
        if (cartUI.saleVerse) cartUI.saleVerse.classList.add('hidden');
        if (modals.customerName.input) modals.customerName.input.value = '';
    };

    const _performAnnulInvoice = async (invoiceId) => {
        if (!db) {
            showAlert("Base de datos no disponible.", "error");
            return;
        }
        if (!invoiceId) {
             showAlert("Error interno: ID de factura para anular está vacío.", "error");
             return;
        }
        try {
            await db.collection('sales').doc(invoiceId).update({
                annulled: true,
                annulledAt: firebase.firestore.FieldValue.serverTimestamp(),
                annulledBy: {
                    uid: currentUser.uid,
                    name: currentUser.username || currentUser.name
                }
            });
            showAlert(`Factura ${invoiceId.substring(0, 6)}... marcada como ANULADA.`, "success");
            hideAllModals();
            if (document.getElementById('cuadrecaja-section')?.classList.contains('active')) {
                generateCashReport();
            } else if (document.getElementById('admin-reports-section')?.classList.contains('active')) {
                generateAdminReport();
            }
        } catch (error) {
            console.error("Error al anular la factura:", error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert('Error de permisos al anular factura. Revisa tus reglas de seguridad.', "error");
            } else {
                showAlert('Error al anular la factura. Intenta de nuevo.', "error");
            }
        }
    };
    const simulateModifyInvoice = async (invoiceId) => {
        try {
            const saleDoc = await db.collection('sales').doc(invoiceId).get();
            if (saleDoc.exists) {
                const originalSaleData = {
                    id: saleDoc.id,
                    ...saleDoc.data()
                };
                cart = originalSaleData.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    costPrice: item.costPriceAtTimeOfSale, 
                    quantity: item.quantity
                }));
                cartDiscountType = originalSaleData.discountTypeApplied || 'none';
                cartDiscountValue = originalSaleData.discountValueApplied || 0;
                
                showSection('ventas');
                updateCartUI();
                hideAllModals();
                
                showToast(`Carrito cargado con datos de la factura ${invoiceId.substring(0,6)}... para su corrección. ANULA la original y genera una nueva.`, "info", 8000);
            } else {
                showAlert("No se pudo cargar la factura original para modificar.", "error");
            }
        } catch (error) {
            console.error("Error al cargar datos de factura para modificar:", error);
            showAlert("Error al cargar la factura para su modificación.", "error");
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
            if (!isOutOfStock && cashRegisterOpen) {
                item.addEventListener("click", () => addProductToCart(product));
            } else if (!cashRegisterOpen) {
                item.title = "Caja cerrada, abre la caja para registrar ventas.";
            } else if (isOutOfStock) {
                item.title = "Producto agotado.";
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
                if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
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
        if (!cashRegisterOpen) {
            showAlert('Caja cerrada. Abre la caja para registrar ventas.', 'warning');
            return;
        }
        console.log("Attempting to add product to cart:", product);

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
            const itemCostPrice = typeof product.costPrice === 'number' ? product.costPrice : 0;
            cart.push({
                id: product.id,
                name: product.name || "Producto sin nombre",
                price: itemPrice,
                costPrice: itemCostPrice,
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
        const modal = modals.editCartItem;
        if (!modal?.element || !modal.nameDisplay || !modal.quantityInput || !modal.priceInput || !modal.stockInfo || !modal.saveButton) {
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
            
            const priceOfPairedHotDogs = numPromoPairs * HOT_DOG_PROMO_PRICE_PER_PAIR;
            
            let originalPriceOfPairedHotDogs = 0;
            let quantityCounted = 0;
            for (const item of hotDogItems) {
                const quantityToConsider = Math.min(item.quantity, (numPromoPairs * 2) - quantityCounted);
                originalPriceOfPairedHotDogs += item.price * quantityToConsider;
                quantityCounted += quantityToConsider;
                if (quantityCounted >= numPromoPairs * 2) break;
            }

            discount = Math.max(0, originalPriceOfPairedHotDogs - priceOfPairedHotDogs);

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

        if (!itemsList || !placeholder || !paymentMethodSection || !processSaleButton || !saleVerse || !subtotalAmountDisplay || !discountAmountSummary || !discountAmountDisplay || !totalAmountSummary || !totalAmountDisplay || !appliedDiscountDisplay || !clearDiscountButton) {
            console.error("Cart UI elements not fully loaded. Some features may not work.");
            return;
        }

        console.log("Updating Cart UI. Current cart:", [...cart], "Discount Type:", cartDiscountType, "Discount Value:", cartDiscountValue, "Discount Amount (calculated):", formatPrice(cartDiscountAmount));

        itemsList.innerHTML = "";
        const subtotal = calculateCartSubtotal();
        cartDiscountAmount = calculateCartDiscount();
        const total = subtotal - cartDiscountAmount;

        if (clearDiscountButton) {
            clearDiscountButton.removeEventListener("click", handleClearDiscount);
            if (cartDiscountAmount > 0) {
                clearDiscountButton.addEventListener("click", () => {
                    if (currentUser && currentUser.role === 'colaborator') {
                        showModal(modals.adminCode, 'eliminar descuento', handleClearDiscount);
                    } else {
                        handleClearDiscount();
                    }
                });
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
                const itemNameDisplay = (item.name || "Producto").length > 20 ? (item.name || "Producto").substring(0, 17) + "..." : item.name || "Producto";
                const itemTotalPrice = (item.price ?? 0) * (item.quantity ?? 0);
                li.innerHTML = `
                    <span>${item.quantity ?? 0}x ${itemNameDisplay}</span>
                    <span>${formatPrice(itemTotalPrice)}</span>
                     <div class="item-actions">
                        <button class="icon-button small edit-item-button" data-id="${item.id}" title="Editar Item" aria-label="Editar ${item.name || "Producto"} en carrito"><i class="fas fa-edit"></i></button>
                        <button class="icon-button small remove-item-button" data-id="${item.id}" title="Remover Item" aria-label="Remover ${item.name || "Producto"} del carrito"><i class="fas fa-times-circle"></i></button>
                     </div>
                `;

                const removeButton = li.querySelector(".remove-item-button");
                if (removeButton) {
                    removeButton.addEventListener("click", (e) => {
                        const idToRemove = e.target.closest(".remove-item-button")?.dataset.id;
                        if (idToRemove) {
                            removeProductFromCart(idToRemove);
                        }
                    });
                }
                const editButton = li.querySelector(".edit-item-button");
                if (editButton) {
                    editButton.addEventListener("click", () => {
                        if (currentUser && currentUser.role === 'colaborator') {
                            showModal(modals.adminCode, "editar item del carrito", () =>
                                openEditCartItemModal(item)
                            );
                        } else {
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

        if (!processSaleButton || !cashPaymentDetails || !amountReceivedInput || !changeAmountDisplay || !paymentMethodSelect) {
            console.error("Change display UI elements not fully loaded.");
            return;
        }

        const total = currentTotal || 0;
        const amountReceivedInputVal = parseFloat(amountReceivedInput.value ?? "0") || 0;

        let change = 0;
        let canProcess = cart.length > 0 && total >= 0 && cashRegisterOpen;

        const selectedMethod = paymentMethodSelect.value;
        if (selectedMethod === "efectivo") {
            cashPaymentDetails.classList.remove("hidden");
            amountReceivedInput.disabled = false;

            change = amountReceivedInputVal - total;
            if (amountReceivedInputVal < total) {
                canProcess = false;
                console.log("Cannot process: Amount received is insufficient.");
            }
        } else {
            cashPaymentDetails.classList.add("hidden");
            amountReceivedInput.disabled = true;
            change = 0;
        }

        changeAmountDisplay.textContent = formatPrice(Math.max(0, change));
        console.log("Calculated change:", change);

        processSaleButton.disabled = !canProcess;
        console.log("Process button disabled:", !canProcess);
    };

    const handleClearDiscount = () => {
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

    const generateInvoiceHTML = (sale, isCustomerCopy = true, forAdminReport = false) => {
        const saleTimestamp = sale.localTimestamp?.toDate ?
            sale.localTimestamp.toDate() :
            (sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date());

        const formattedTimestamp = saleTimestamp?.toLocaleString("es-DO") || "N/A";

        let invoice = ``;
        invoice += `    La Hotdoguería RD\n`;
        invoice += `  "El clásico que nunca falla"\n`;
        invoice += ` Av MTS - salida Cabrera, Nagua.\n`;
        invoice += `Vendedor: ${sale.vendedorNombre || "Desconocido"}\n`;
        if (sale.customerName) {
            invoice += `Cliente: ${sale.customerName}\n`;
        }
        invoice += `\n`;
        invoice += `ID Venta: ${sale.id || "N/A"}\n`;
        invoice += `Fecha/Hora: ${formattedTimestamp}\n`;

        if (sale.annulled) {
            invoice += `\n****** FACTURA ANULADA ******\n`;
            if (sale.annulledAt?.toDate) {
                invoice += `Fecha Anulación: ${sale.annulledAt.toDate().toLocaleString("es-DO")}\n`;
            }
            if (sale.annulledBy?.name) {
                invoice += `Anulada por: ${sale.annulledBy.name}\n`;
            }
            invoice += `***************************\n\n`;
        }

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

                if (forAdminReport) {
                    const itemCostPrice = item.costPriceAtTimeOfSale ?? 0;
                    const itemProfit = (itemPrice - itemCostPrice) * itemQuantity;
                    invoice += ` (Costo: ${formatPrice(itemCostPrice*itemQuantity)}, Ganancia: ${formatPrice(itemProfit)})`;
                }
                invoice += `\n`;
            });
        } else {
            invoice += `  Sin detalles de items\n`;
            console.warn("Sale items array is missing or invalid for invoice:", sale.id, sale.items);
        }

        invoice += `----------------------------------\n`;
        const subtotal = sale.subtotal ?? sale.total ?? 0;
        const discountAmount = sale.discountAmount ?? 0;
        const totalProfit = sale.totalProfit ?? 0;
        const totalHotdogCommission = sale.totalHotdogCommission ?? 0;


        invoice += `Subtotal: ${formatPrice(subtotal)}\n`;
        if (discountAmount > 0) {
            let discountDescription = '';
            if (sale.discountTypeApplied === 'hotdog2x150') {
                discountDescription = `Promo 2x$${HOT_DOG_PROMO_PRICE_PER_PAIR}`;
            } else if (sale.discountTypeApplied === 'percentage') {
                discountDescription = `Desc: ${sale.discountValueApplied ?? 0}%`;
            } else if (sale.discountTypeApplied === 'fixed') {
                discountDescription = `Desc: ${formatPrice(sale.discountValueApplied ?? 0)}`;
            } else {
                discountDescription = `Descuento`;
            }
            invoice += `${discountDescription}: ${formatPrice(discountAmount)}\n`;
        }
        invoice += `Total: ${formatPrice(sale.total ?? 0)}\n`;
        invoice += `Método de Pago: ${sale.metodoPago ? sale.metodoPago.toUpperCase() : "N/A"}\n`;

        if (sale.metodoPago === "efectivo") {
            invoice += `Monto Recibido: ${formatPrice(sale.montoRecibido ?? (sale.total ?? 0))}\n`;
            invoice += `Cambio: ${formatPrice(sale.cambio ?? 0)}\n`;
        } else if (sale.metodoPago === "credito") {
            invoice += `Cliente Crédito: ${sale.customerName || "N/A"}\n`;
            if (forAdminReport && sale.creditAccountId) {
                invoice += `ID Crédito: ${sale.creditAccountId.substring(0, 6)}...\n`;
            }
        }
        if (forAdminReport) {
            invoice += `----------------------------------\n`;
            invoice += `Ganancia Neta de la Venta: ${formatPrice(totalProfit)}\n`;
            if (totalHotdogCommission > 0) {
                invoice += `Comisión Hotdogs Generada: ${formatPrice(totalHotdogCommission)}\n`;
            }
            invoice += `----------------------------------\n`;
        }

        invoice += `¡Gracias por su compra, vuelva pronto!\n`;
        invoice += `       Jehová Jiréh\n`;
        invoice += `----------------------------------\n`;

        return invoice;
    };
      const _confirmCreditSale = async () => {
        if (!db || !currentUser) {
            showAlert("Base de datos o usuario no disponible. Intenta recargar.", "error");
            return;
        }

        const button = modals.creditAccount.confirmCreditSaleButton;
        button.disabled = true;
        button.textContent = "Procesando Crédito...";

        const customerNameFromInput = modals.creditAccount.customerNameInput.value.trim();
        const customerContactFromInput = modals.creditAccount.customerContactInput.value.trim();

        const batch = db.batch();
        let finalCustomer;

        try {
            if (currentCreditCustomer) {
                finalCustomer = {
                    id: currentCreditCustomer.uid || currentCreditCustomer.id,
                    name: currentCreditCustomer.name || currentCreditCustomer.username || currentCreditCustomer.customerName,
                    contact: currentCreditCustomer.contact || currentCreditCustomer.customerContact || '',
                    type: currentCreditCustomer.type
                };
            } else {
                if (!customerNameFromInput) { // Contacto es opcional
                    showAlert("Para un cliente nuevo, debes ingresar al menos el Nombre.", "warning");
                    button.disabled = false;
                    button.textContent = "Registrar Crédito";
                    return;
                }
                const newCustomerRef = db.collection('customers').doc();
                finalCustomer = {
                    id: newCustomerRef.id,
                    name: customerNameFromInput,
                    contact: customerContactFromInput,
                    type: 'customer'
                };
                batch.set(newCustomerRef, {
                    customerName: finalCustomer.name,
                    customerContact: finalCustomer.contact,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            const subtotal = calculateCartSubtotal();
            const discountAmount = cartDiscountAmount;
            const total = subtotal - discountAmount;
            let totalProfit = 0;
            const saleItemsForFirestore = cart.map((item) => {
                const profitPerItem = (item.price - (item.costPrice || 0)) * item.quantity;
                totalProfit += profitPerItem;
                return { id: item.id, name: item.name, price: item.price, costPriceAtTimeOfSale: item.costPrice || 0, profitPerItem, quantity: item.quantity };
            });

            const saleDocRef = db.collection("sales").doc();
            
            // Lógica de comisión (idéntica a _finalizeSaleProcessing)
            let totalHotdogCommissionForSale = 0;
            const saleItemsForCommission = cart.map(item => ({...item}));
            for (const item of saleItemsForCommission) {
                 const isHotdog = HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION.some(keyword => (item.name || '').toLowerCase().includes(keyword.toLowerCase()));
                 if(isHotdog) {
                    if (currentUser.isTeamAccount && currentShiftTeamMembers.length > 0) {
                        const teamCommissionRate = currentUser.hotdogCommissionPerItem || 0;
                        totalHotdogCommissionForSale += (item.quantity * teamCommissionRate);
                    } else if (!currentUser.isTeamAccount && currentUser.hotdogCommissionEnabled && currentUser.hotdogCommissionPerItem > 0) {
                        totalHotdogCommissionForSale += (item.quantity * currentUser.hotdogCommissionPerItem);
                    }
                 }
            }

            const saleData = {
                id: saleDocRef.id,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                vendedorId: currentUser.uid,
                vendedorNombre: currentUser.username || currentUser.name,
                items: saleItemsForFirestore,
                subtotal,
                discountAmount,
                total,
                totalProfit,
                metodoPago: 'credito',
                creditAccountId: finalCustomer.id,
                customerName: finalCustomer.name,
                shiftId: currentShiftId,
                shiftName: currentShiftName || null,
                totalHotdogCommission: totalHotdogCommissionForSale,
                shiftTeamMembers: currentUser.isTeamAccount ? currentShiftTeamMembers : []
            };

            batch.set(saleDocRef, saleData);
            const creditAccountRef = db.collection('creditAccounts').doc(finalCustomer.id);
            
            const transaction = {
                transactionId: saleDocRef.id,
                amount: total,
                // CORRECCIÓN: Usar la hora del cliente en lugar de serverTimestamp()
                date: new Date(),
                type: 'sale',
                description: `Venta a crédito #${saleDocRef.id.substring(0,6)}...`
            };

            const creditAccountSnapshot = await creditAccountRef.get();

            if (creditAccountSnapshot.exists) {
                batch.update(creditAccountRef, {
                    balance: firebase.firestore.FieldValue.increment(total),
                    totalDue: firebase.firestore.FieldValue.increment(total),
                    status: 'pending',
                    lastTransactionDate: new Date(),
                    transactions: firebase.firestore.FieldValue.arrayUnion(transaction)
                });
            } else {
                batch.set(creditAccountRef, {
                    customerId: finalCustomer.id,
                    customerName: finalCustomer.name,
                    balance: total,
                    totalDue: total,
                    status: 'pending',
                    createdAt: new Date(),
                    transactions: [transaction],
                    lastTransactionDate: new Date(),
                });
            }

            for (const cartItem of cart) {
                const productRef = db.collection("products").doc(cartItem.id);
                batch.update(productRef, { stock: firebase.firestore.FieldValue.increment(-cartItem.quantity) });
            }

            await batch.commit();

            showAlert(`Venta a crédito para ${finalCustomer.name} registrada con éxito.`, "success");

            const savedSaleData = { ...saleData, localTimestamp: new Date() };
            hideAllModals();
            resetSaleAfterCompletion();
            showModal(modals.invoicePreview, `<pre>${generateInvoiceHTML(savedSaleData, true, false)}</pre>`, savedSaleData.id);

            loadProductsFromFirestore();
            updateLowStockCount();
            updateCashDashboardTotals();

        } catch (error) {
            console.error("Error procesando venta a crédito:", error);
            showAlert("Error al procesar la venta a crédito. Revisa la consola para detalles.", "error");
        } finally {
            button.disabled = false;
            button.textContent = "Registrar Crédito";
            if (cartUI.processSaleButton) {
                cartUI.processSaleButton.textContent = "Procesar Venta";
                cartUI.processSaleButton.disabled = false;
            }
        }
    };
        const _confirmRecordPayment = async () => {
        const modal = modals.recordPayment;
        if (!modal || !modal.customerId || !modal.amountInput || !modal.descriptionInput || !modal.confirmButton) {
            showAlert("Error interno: Elementos del modal de pago no encontrados.", "error");
            return;
        }

        const customerId = modal.customerId;
        const paidAmount = parseFloat(modal.amountInput.value);
        const description = modal.descriptionInput.value.trim();

        if (isNaN(paidAmount) || paidAmount <= 0) {
            showAlert("Por favor, ingresa un monto válido mayor que 0.", "warning");
            modal.amountInput.focus();
            return;
        }
        if (paidAmount > modal.customerBalance) {
            showAlert("El monto del pago no puede ser mayor al saldo pendiente.", "warning");
            modal.amountInput.value = modal.customerBalance.toFixed(2);
            modal.amountInput.focus();
            return;
        }
        if (!description) {
            showAlert("Por favor, ingresa una descripción para el pago.", "warning");
            modal.descriptionInput.focus();
            return;
        }

        modal.confirmButton.disabled = true;
        modal.confirmButton.textContent = "Registrando...";

        try {
            const creditAccountRef = db.collection('creditAccounts').doc(customerId);
            const accountDoc = await creditAccountRef.get();

            if (!accountDoc.exists) {
                showAlert("Error: Cuenta por cobrar no encontrada.", "error");
                return;
            }

            const currentData = accountDoc.data();
            const newBalance = currentData.balance - paidAmount;
            const newStatus = newBalance <= 0 ? 'paid' : 'pending';

            const transaction = {
                transactionId: db.collection('creditAccounts').doc().id,
                amount: paidAmount,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'payment',
                description: description,
                recordedBy: {
                    id: currentUser.uid,
                    name: currentUser.username || currentUser.name
                },
                shiftId: currentShiftId,
                shiftName: currentShiftName || null
            };

            await creditAccountRef.update({
                balance: newBalance,
                status: newStatus,
                transactions: firebase.firestore.FieldValue.arrayUnion(transaction),
                lastTransactionDate: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showAlert(`Pago de ${formatPrice(paidAmount)} registrado con éxito. Saldo pendiente: ${formatPrice(newBalance)}.`, "success");
            hideAllModals();
            if (document.getElementById('admin-reports-section')?.classList.contains('active')) {
                generateAdminReport();
            }

        } catch (error) {
            console.error("Error registrando pago:", error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos al registrar el pago. Revisa tus Security Rules.", "error");
            } else {
                showAlert("Error al registrar el pago. Intenta de nuevo.", "error");
            }
        } finally {
            modal.confirmButton.disabled = false;
            modal.confirmButton.textContent = "Confirmar Pago";
        }
    };
    const populateEmployeeSelectForAdminReports = async () => {
        const selectElement = adminReportsUI.employeeSelect;
        if (!db || !selectElement) {
            console.error("DB or admin report employee select element not found.");
            return;
        }

        selectElement.innerHTML = '<option value="all">Todos los Empleados</option>';
        try {
            const snapshot = await db.collection('users').orderBy('name').get();
            snapshot.docs.forEach(doc => {
                const user = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${user.name || user.username || user.email || 'Desconocido'} (${user.role === 'admin' ? 'Admin' : 'Colaborador'})`;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading users for employee select in admin reports:", error);
            showAlert('No se pudieron cargar los empleados para el reporte.', "error");
        }
    };

    const setupAccordion = (headerElement, contentElement) => {
        if (!headerElement || !contentElement) {
            console.warn("Accordion elements not found:", headerElement, contentElement);
            return;
        }
        headerElement.removeEventListener('click', toggleAccordion);
        headerElement.addEventListener('click', toggleAccordion);

        function toggleAccordion() {
            headerElement.classList.toggle('active');
            if (contentElement.style.maxHeight) {
                contentElement.style.maxHeight = null;
            } else {
                contentElement.style.maxHeight = contentElement.scrollHeight + "px";
            }
        }
        contentElement.style.maxHeight = null; // Inicia cerrado
        headerElement.classList.remove('active');
    };

    const generateShiftReportHTML = () => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("es-DO", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = now.toLocaleTimeString("es-DO", {
            hour: '2-digit',
            minute: '2-digit'
        });

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
        async function updateCashDashboardTotals() {
        if (!cashRegisterOpen || !db || !currentUser || !cuadreCajaUI.section) {
            clearCashDashboardUI(false);
            return;
        }

        const shiftDoc = await db.collection('shifts').doc(currentShiftId).get();
        if (!shiftDoc.exists) {
            console.error("Shift document not found for dashboard totals.");
            clearCashDashboardUI(false);
            return;
        }
        const shiftOwnerId = shiftDoc.data().userId;
        
        const isOwner = currentUser.uid === shiftOwnerId;
        const isAdmin = currentUser.role === 'admin';

        if (!isOwner && !isAdmin) {
            clearCashDashboardUI(true); 
            return;
        }

        if (cuadreCajaUI.departmentSalesChartContainer) {
            cuadreCajaUI.departmentSalesChartContainer.innerHTML = '<canvas id="salesByCategoryChart" style="width:100%; max-height:250px;"></canvas>';
            cuadreCajaUI.salesByCategoryChartCanvas = document.getElementById('salesByCategoryChart');
        }
        if (cuadreCajaUI.paymentMethodsChartContainer) {
            cuadreCajaUI.paymentMethodsChartContainer.innerHTML = '<canvas id="paymentMethodsChart" style="width:100%; max-height:250px;"></canvas>';
            cuadreCajaUI.paymentMethodsChartCanvas = document.getElementById('paymentMethodsChart');
        }

        if (productsCache.length === 0) {
            try {
                const productsSnapshot = await db.collection("products").get();
                productsCache = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Error loading products for dashboard totals:", error);
            }
        }

        try {
            const salesSnapshot = await db.collection('sales')
                .where('annulled', '!=', true)
                .where('shiftId', '==', currentShiftId)
                .get();

            const movementsSnapshot = await db.collection('cashMovements').where('shiftId', '==', currentShiftId).get();

            let cashSalesToday = 0, cardSalesToday = 0, totalSalesToday = 0, transferSalesToday = 0, creditSalesToday = 0, otherSalesToday = 0;
            const departmentSales = {};
            const paymentMethodCounts = {
                'efectivo': 0, 'tarjeta': 0, 'transferencia': 0, 'credito': 0, 'otro': 0
            };

            salesSnapshot.docs.forEach(doc => {
                const sale = doc.data();
                const total = sale.total || 0;
                totalSalesToday += total;
                switch (sale.metodoPago) {
                    case 'efectivo': cashSalesToday += total; paymentMethodCounts.efectivo++; break;
                    case 'tarjeta': cardSalesToday += total; paymentMethodCounts.tarjeta++; break;
                    case 'transferencia': transferSalesToday += total; paymentMethodCounts.transferencia++; break;
                    case 'credito': creditSalesToday += total; paymentMethodCounts.credito++; break;
                    case 'otro': otherSalesToday += total; paymentMethodCounts.otro++; break;
                }
                if (sale.items) {
                    sale.items.forEach(item => {
                        const product = productsCache.find(p => p.id === item.id);
                        const category = product ? product.category : 'Desconocido';
                        departmentSales[category] = (departmentSales[category] || 0) + (item.price * item.quantity);
                    });
                }
            });

            let totalAdditionsToday = 0, totalOutflowsToday = 0;
            movementsSnapshot.docs.forEach(doc => {
                const move = doc.data();
                if (move.type === 'addition') totalAdditionsToday += move.amount || 0;
                if (move.type === 'outflow') totalOutflowsToday += move.amount || 0;
            });

            if (cuadreCajaUI.cashSalesAmount) cuadreCajaUI.cashSalesAmount.textContent = formatPrice(cashSalesToday);
            if (cuadreCajaUI.totalEntries) cuadreCajaUI.totalEntries.textContent = formatPrice(totalAdditionsToday);
            if (cuadreCajaUI.supplierPayments) cuadreCajaUI.supplierPayments.textContent = formatPrice(totalOutflowsToday);
            const estimatedCashInHand = currentShiftInitialCash + currentShiftCashChange + cashSalesToday + totalAdditionsToday - totalOutflowsToday;
            if (cuadreCajaUI.currentEstimatedCashInHandDisplay) cuadreCajaUI.currentEstimatedCashInHandDisplay.textContent = formatPrice(estimatedCashInHand);
            if (cuadreCajaUI.currentCashTotal) cuadreCajaUI.currentCashTotal.textContent = formatPrice(estimatedCashInHand);
            if (cuadreCajaUI.cashPayments) cuadreCajaUI.cashPayments.textContent = formatPrice(cashSalesToday);
            if (cuadreCajaUI.cardPayments) cuadreCajaUI.cardPayments.textContent = formatPrice(cardSalesToday);
            if (cuadreCajaUI.totalPayments) cuadreCajaUI.totalPayments.textContent = formatPrice(totalSalesToday);
            
            if (cuadreCajaUI.salesByCategoryChartCanvas) {
                if (salesByCategoryChartInstance) salesByCategoryChartInstance.destroy();
                const ctx = cuadreCajaUI.salesByCategoryChartCanvas.getContext('2d');
                const categories = Object.keys(departmentSales);
                const salesValues = Object.values(departmentSales);
                const backgroundColors = categories.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

                salesByCategoryChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: categories,
                        datasets: [{
                            label: 'Ventas por Categoría',
                            data: salesValues,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.4)')),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { callback: value => formatPrice(value) } } },
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.dataset.label || ''}: ${formatPrice(context.parsed.y)}` } } }
                    }
                });
            }

            if (cuadreCajaUI.paymentMethodsChartCanvas) {
                if (paymentMethodsChartInstance) paymentMethodsChartInstance.destroy();
                const ctx = cuadreCajaUI.paymentMethodsChartCanvas.getContext('2d');
                const methodLabels = Object.keys(paymentMethodCounts).filter(key => paymentMethodCounts[key] > 0).map(key => key.charAt(0).toUpperCase() + key.slice(1));
                const methodData = Object.values(paymentMethodCounts).filter(val => val > 0);
                const backgroundColors = methodLabels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

                if (methodData.length > 0) {
                    paymentMethodsChartInstance = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: methodLabels,
                            datasets: [{
                                label: 'Número de Ventas', data: methodData, backgroundColor: backgroundColors,
                                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim(), borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() } },
                                tooltip: {
                                    callbacks: {
                                        label: context => {
                                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                                            return `${context.label}: ${context.parsed} (${percentage})`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    cuadreCajaUI.paymentMethodsChartContainer.innerHTML = '<p class="placeholder-text">Sin ventas para mostrar gráfico.</p>';
                }
            }
            
            let totalDeptSales = 0;
            Object.keys(departmentSales).forEach(category => totalDeptSales += departmentSales[category]);
            if (cuadreCajaUI.totalDepartmentSales) cuadreCajaUI.totalDepartmentSales.textContent = formatPrice(totalDeptSales);
            updateCashTotals();

        } catch (error) {
            console.error('Error updating cash dashboard totals:', error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert('Error de permisos al actualizar totales. Revisa tus reglas de seguridad.', 'error');
                clearCashDashboardUI(true);
            } else {
                showAlert('Error actualizando totales de caja. Revisa la consola.', 'error');
            }
        }
    }
        const renderSalesTrendChart = (salesData, chartId = 'salesTrendChart') => {
        if (!adminReportsUI.salesTrendChartCanvas) return;
        if (salesTrendChartInstance) salesTrendChartInstance.destroy();

        const ctx = adminReportsUI.salesTrendChartCanvas.getContext('2d');

        const dailyData = {};
        salesData.forEach(sale => {
            if (sale.annulled) return; // Omitir ventas anuladas
            const date = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp);
            const dateStr = date.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { totalSales: 0, totalProfit: 0 };
            }
            dailyData[dateStr].totalSales += sale.total || 0;
            dailyData[dateStr].totalProfit += sale.totalProfit || 0;
        });

        const labels = [];
        const dataSales = [];
        const dataProfit = [];
        const start = new Date(adminReportsUI.reportStartDate.value);
        const end = new Date(adminReportsUI.reportEndDate.value);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr);
            dataSales.push(dailyData[dateStr]?.totalSales || 0);
            dataProfit.push(dailyData[dateStr]?.totalProfit || 0);
        }

        salesTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas Totales (RD$)',
                    data: dataSales,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim(),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim() + '30',
                    fill: true,
                    tension: 0.3
                }, {
                    label: 'Ganancia Bruta (RD$)',
                    data: dataProfit,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3').trim(),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3').trim() + '30',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'PPP',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Fecha'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monto (RD$)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatPrice(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatPrice(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderCommissionStackedBarChart = (commissionsData, chartId = 'commissionStackedBarChart') => {
        if (!adminReportsUI.commissionStackedBarChartCanvas) return;
        if (commissionStackedBarChartInstance) commissionStackedBarChartInstance.destroy();

        const ctx = adminReportsUI.commissionStackedBarChartCanvas.getContext('2d');

        const labels = commissionsData.map(c => c.name);
        const generalCommissions = commissionsData.map(c => c.generalCommission);
        const hotdogCommissions = commissionsData.map(c => c.hotdogCommission);

        commissionStackedBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Comisión General',
                    data: generalCommissions,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-2').trim(),
                }, {
                    label: 'Comisión Hotdog',
                    data: hotdogCommissions,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim(),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Empleado'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monto de Comisión (RD$)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatPrice(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatPrice(context.parsed.y);
                                }
                                return label;
                            },
                            footer: function(tooltipItems) {
                                let total = 0;
                                tooltipItems.forEach(function(tooltipItem) {
                                    total += tooltipItem.parsed.y;
                                });
                                return 'Total: ' + formatPrice(total);
                            }
                        }
                    }
                }
            }
        });
    };
        const renderAccountsReceivableChart = (accountsData, chartId = 'accountsReceivableChart') => {
        const arChartCanvas = document.getElementById(chartId);
        if (!arChartCanvas) return;
        if (accountsReceivableChart) accountsReceivableChart.destroy();

        const ctx = arChartCanvas.getContext('2d');

        const totalPaid = accountsData.filter(acc => acc.balance <= 0).reduce((sum, acc) => sum + acc.totalDue, 0);
        const totalPending = accountsData.filter(acc => acc.balance > 0).reduce((sum, acc) => sum + acc.balance, 0);

        const labels = ['Total Pagado', 'Total Pendiente'];
        const data = [totalPaid, totalPending];
        const backgroundColors = [
            getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim()
        ];
        const borderColors = backgroundColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.4)'));


        accountsReceivableChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monto (RD$)',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatPrice(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const _performCashBalance = async (isClosingShift = false) => {
        await updateCashDashboardTotals();

        const initialCash = currentShiftInitialCash;
        const cashChange = currentShiftCashChange;
        const cashSales = parseFloat(cuadreCajaUI.cashSalesAmount.textContent.replace(/RD\$|\,/g, '')) || 0;
        const entries = parseFloat(cuadreCajaUI.totalEntries.textContent.replace(/RD\$|\,/g, '')) || 0;
        const supplierPayments = parseFloat(cuadreCajaUI.supplierPayments.textContent.replace(/RD\$|\,/g, '')) || 0;
        const expectedTotal = initialCash + cashChange + cashSales + entries - supplierPayments;

        const getModalContentHtml = (initialValue) => `
           <div class="cash-balance-report">
            <h4>Resumen del Turno Actual</h4>
            <div class="cash-balance-item"><span>Efectivo Inicial del Turno:</span><span>${formatPrice(currentShiftInitialCash + currentShiftCashChange)}</span></div>
            <div class="cash-balance-item"><span>(+) Ventas en Efectivo:</span><span>${formatPrice(cashSales)}</span></div>
            <div class="cash-balance-item"><span>(+) Adiciones de Efectivo:</span><span>${formatPrice(entries)}</span></div>
            <div class="cash-balance-item"><span>(-) Salidas de Efectivo:</span><span>${formatPrice(supplierPayments)}</span></div>
            <div class="cash-balance-total"><span>Total Esperado en Caja:</span><span>${formatPrice(expectedTotal)}</span></div>
            <div class="cash-count-section">
                            <h4>Conteo Físico de Efectivo</h4>
                <div class="form-group"><label for="realCashCount">Efectivo Real en Caja (RD$):</label><input type="number" id="realCashCount" step="0.01" value="${initialValue.toFixed(2)}"></div>
                <div class="cash-balance-item"><span>Diferencia:</span><span id="cash-balance-difference-display">${formatPrice(0)}</span></div>
            </div>
        </div>`;

        const confirmCallback = async () => {
            modals.cashBalanceDisplay.confirmButton.disabled = true;
            const realCashInput = modals.cashBalanceDisplay.element.querySelector('#realCashCount');
            const realCash = parseFloat(realCashInput.value) || 0;
            const difference = realCash - expectedTotal;
            
            const shiftDoc = await db.collection('shifts').doc(currentShiftId).get();
            const shiftOwnerId = shiftDoc.exists ? shiftDoc.data().userId : currentUser.uid;
            
            try {
                const balanceData = {
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    expectedCash: expectedTotal,
                    realCash: realCash,
                    difference: difference,
                    type: isClosingShift ? 'close_shift_balance' : 'manual_balance_check',
                    userId: shiftOwnerId, // El ID del dueño del turno
                    userName: shiftDoc.exists ? shiftDoc.data().userName : currentUser.username || currentUser.name,
                    shiftId: currentShiftId,
                    shiftName: currentShiftName || null,
                    balancedByAdmin: currentUser.role === 'admin' && currentUser.uid !== shiftOwnerId ? currentUser.uid : null
                };
                await db.collection('cashBalances').add(balanceData);
                console.log("Cuadre de caja registrado en Firestore.");

                if (isClosingShift) {
                    await db.collection('shifts').doc(currentShiftId).update({
                        endTime: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'closed',
                        finalBalance: balanceData
                    });
                    await db.collection('users').doc(shiftOwnerId).update({
                        isCashRegisterOpen: false,
                        currentShiftId: null
                    });
                    
                    // Si el usuario actual es el que cerró su propia caja
                    if(currentUser.uid === shiftOwnerId) {
                        cashRegisterOpen = false;
                        currentShiftId = null;
                        currentShiftStartTime = null;
                        currentShiftInitialCash = 0;
                        currentShiftCashChange = 0;
                        currentShiftName = '';
                        currentShiftTeamMembers = [];
                        clearCashDashboardUI();
                        updateCashRegisterUIState();
                        resetSaleAfterCompletion();
                        renderRecentCashMovements();
                    }
                    
                    showToast(`Turno de ${balanceData.userName} finalizado y caja cerrada con éxito.`, "success");
                } else {
                    showToast("Cuadre de caja verificado y registrado en el historial.", "info");
                }

            } catch (error) {
                console.error("Error registrando cuadre de caja:", error);
                if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                     showAlert("Error de permisos al guardar el cuadre. Revisa tus reglas de seguridad.", "error");
                } else {
                    showAlert("Error al guardar el cuadre de caja.", "error");
                }
            } finally {
                hideAllModals();
            }
        };

        const modalTitle = isClosingShift ? 'Cierre y Cuadre Final de Caja' : 'Verificar Cuadre de Caja';
        showModal(modals.cashBalanceDisplay, modalTitle, getModalContentHtml(expectedTotal), confirmCallback);

        const realCashCountInput = modals.cashBalanceDisplay.element.querySelector('#realCashCount');
        if (realCashCountInput) {
            updateCashBalanceDifferenceDisplay(realCashCountInput, expectedTotal);
            realCashCountInput.addEventListener('input', () => updateCashBalanceDifferenceDisplay(realCashCountInput, expectedTotal));
        }
    };
        const loadUsersForTeamSelection = async () => {
        const teamMembersList = modals.setTeamMembers?.teamMembersList;
        if (!db || !teamMembersList) {
            console.error("DB or team members list element not found for selection.");
            return;
        }

        teamMembersList.innerHTML = '<p class="placeholder-text">Cargando usuarios para selección...</p>';

        try {
            const snapshot = await db.collection('users').get();
            const allActiveUsers = snapshot.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }))
                .filter(user => user.role === 'admin' || user.role === 'colaborator')
                .sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || ''));


            teamMembersList.innerHTML = '';

            if (allActiveUsers.length === 0) {
                teamMembersList.innerHTML = '<p class="placeholder-text">No hay usuarios activos para conformar un equipo.</p>';
                return;
            }

            allActiveUsers.forEach(user => {
                const li = document.createElement('li');
                const displayName = user.name || user.username || user.email || "Desconocido";
                li.innerHTML = `
                    <input type="checkbox" id="team-member-${user.uid}" value="${displayName}" data-uid="${user.uid}">
                    <label for="team-member-${user.uid}">${displayName} (${user.role === 'admin' ? 'Admin' : 'Colaborador'})</label>
                `;
                const checkbox = li.querySelector('input[type="checkbox"]');
                if (currentShiftTeamMembers.includes(displayName)) {
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
        // AÑADE ESTA FUNCIÓN COMPLETA
    const loadAccountsReceivable = async (searchTerm = '') => {
        if (!cuentasUI.listContainer) return;
        cuentasUI.listContainer.innerHTML = '<p class="placeholder-text">Cargando...</p>';

        try {
            let query = db.collection('creditAccounts').where('balance', '>', 0).orderBy('balance', 'desc');
            const snapshot = await query.get();

            let accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (searchTerm) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                accounts = accounts.filter(acc => 
                    (acc.customerName && acc.customerName.toLowerCase().includes(lowerSearchTerm)) ||
                    (acc.customerId && acc.customerId.toLowerCase().includes(lowerSearchTerm))
                );
            }

            if (accounts.length === 0) {
                cuentasUI.listContainer.innerHTML = '<p class="placeholder-text">No hay cuentas pendientes.</p>';
                return;
            }

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Fecha de Última Transacción</th>
                        <th>Total Adeudado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${accounts.map(acc => `
                        <tr>
                            <td data-label="Cliente">${acc.customerName || 'N/A'}</td>
                            <td data-label="Última Transacción">${acc.lastTransactionDate?.toDate().toLocaleDateString('es-DO') || 'N/A'}</td>
                            <td data-label="Total Adeudado"><strong>${formatPrice(acc.balance)}</strong></td>
                            <td class="table-actions">
                                <button class="button-primary small record-payment-button" data-customer-id="${acc.id}">Registrar Pago</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            cuentasUI.listContainer.innerHTML = '';
            cuentasUI.listContainer.appendChild(table);

            cuentasUI.listContainer.querySelectorAll('.record-payment-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const customerId = e.currentTarget.dataset.customerId;
                    const customerData = accounts.find(c => c.id === customerId);
                    if (customerData) {
                        handleRecordPayment(customerData);
                    }
                });
            });

        } catch (error) {
            console.error("Error cargando cuentas por cobrar:", error);
            cuentasUI.listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar las cuentas.</p>';
        }
    };

    const loadUsersForAdminCashbox = async () => {
        const userSelect = modals.adminOpenCashbox?.userSelect;
        if (!db || !userSelect) {
            console.error("DB o elemento select de usuario no encontrado.");
            return;
        }
        userSelect.innerHTML = '<option value="">Seleccione un usuario...</option>';

        try {
            const snapshot = await db.collection('users').orderBy('name').get();
            const users = snapshot.docs
                .map(doc => ({ uid: doc.id, ...doc.data() }))
                .filter(user => !user.isCashRegisterOpen); // Solo mostrar usuarios con caja cerrada
            
            if (users.length === 0) {
                userSelect.innerHTML = '<option value="">No hay usuarios con caja cerrada</option>';
            }

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.uid;
                option.textContent = user.name || user.username || 'Usuario sin nombre';
                option.dataset.name = user.name || user.username;
                userSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargando usuarios para el modal de admin:", error);
            showAlert('No se pudieron cargar los usuarios.', 'error');
        }
    };
    
    const loadCustomersForCreditSelection = async () => {
        const customerResultsList = modals.creditAccount?.customerResultsList;
        if (!db || !customerResultsList) {
            console.error("DB or customer results list element not found.");
            return;
        }
        customerResultsList.innerHTML = '<p class="placeholder-text">Cargando clientes y usuarios...</p>';

        try {
            const usersSnapshot = await db.collection('users').where('role', '==', 'colaborator').get();
            const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data(), type: 'user' }));

            const customersSnapshot = await db.collection('customers').get();
            const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'customer' }));

            let allCustomers = [...users, ...customers];

            allCustomers.sort((a, b) => {
                const nameA = (a.name || a.username || a.customerName || '').toLowerCase();
                const nameB = (b.name || b.username || b.customerName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            customerResultsList.innerHTML = '';
            if (allCustomers.length === 0) {
                customerResultsList.innerHTML = '<p class="placeholder-text">No hay clientes o usuarios registrados.</p>';
                return;
            }

            allCustomers.forEach(entity => {
                const li = document.createElement('li');
                const displayName = entity.name || entity.username || entity.customerName || 'Sin Nombre';
                const contact = entity.contact || entity.customerContact || '';
                const id = entity.uid || entity.id;

                li.textContent = `${displayName}${contact ? ` (${contact})` : ''} - (ID: ${id.substring(0,6)}...)`;
                li.dataset.id = id;
                li.dataset.type = entity.type;

                li.addEventListener('click', () => {
                    currentCreditCustomer = entity;
                    modals.creditAccount.customerNameInput.value = displayName;
                    modals.creditAccount.customerContactInput.value = contact;
                    modals.creditAccount.customerIdDisplay.value = id;
                    modals.creditAccount.customerNameInput.disabled = true;
                    modals.creditAccount.customerContactInput.disabled = true;

                    modals.creditAccount.customerResultsList.innerHTML = '';
                });
                customerResultsList.appendChild(li);
            });

        } catch (error) {
            console.error("Error loading customers for credit selection:", error);
            customerResultsList.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar clientes.</p>';
            showAlert('No se pudieron cargar los clientes para crédito.', "error");
        }
    };
        const searchCustomersForCredit = async (searchTerm) => {
        const customerResultsList = modals.creditAccount?.customerResultsList;
        if (!db || !customerResultsList) return;

        customerResultsList.innerHTML = '<p class="placeholder-text">Buscando...</p>';

        try {
            let results = {};
            const lowerSearchTerm = searchTerm.toLowerCase();

            const usersSnapshot = await db.collection('users').get();
            usersSnapshot.docs.forEach(doc => {
                const user = { uid: doc.id, ...doc.data(), type: 'user' };
                const displayName = (user.name || user.username || user.email || '').toLowerCase();
                const contact = (user.contact || '').toLowerCase();
                if (displayName.includes(lowerSearchTerm) || contact.includes(lowerSearchTerm) || user.email.toLowerCase().includes(lowerSearchTerm)) {
                    results[user.uid] = user;
                }
            });

            const customersSnapshot = await db.collection('customers').get();
            customersSnapshot.docs.forEach(doc => {
                const customer = { id: doc.id, ...doc.data(), type: 'customer' };
                const displayName = (customer.customerName || '').toLowerCase();
                const contact = (customer.customerContact || '').toLowerCase();
                if (displayName.includes(lowerSearchTerm) || contact.includes(lowerSearchTerm)) {
                    results[customer.id] = customer;
                }
            });

            const filteredResults = Object.values(results).sort((a, b) => {
                const nameA = (a.name || a.username || a.customerName || '').toLowerCase();
                const nameB = (b.name || b.username || b.customerName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            customerResultsList.innerHTML = '';
            if (filteredResults.length === 0) {
                customerResultsList.innerHTML = '<p class="placeholder-text">No se encontraron clientes o usuarios.</p>';
                return;
            }

            filteredResults.forEach(entity => {
                const li = document.createElement('li');
                const displayName = entity.name || entity.username || entity.customerName || "Desconocido";
                const contact = entity.contact || entity.customerContact || '';
                const id = entity.uid || entity.id;

                li.textContent = `${displayName}${contact ? ` (${contact})` : ''} - (ID: ${id.substring(0,6)}...)`;
                li.dataset.id = id;
                li.dataset.type = entity.type;

                li.addEventListener('click', () => {
                    currentCreditCustomer = entity;
                    modals.creditAccount.customerNameInput.value = displayName;
                    modals.creditAccount.customerContactInput.value = contact;
                    modals.creditAccount.customerIdDisplay.value = id;
                    modals.creditAccount.customerNameInput.disabled = true;
                    modals.creditAccount.customerContactInput.disabled = true;

                    modals.creditAccount.customerResultsList.innerHTML = '';
                });
                customerResultsList.appendChild(li);
            });

        } catch (error) {
            console.error("Error searching customers for credit:", error);
            customerResultsList.innerHTML = '<p class="placeholder-text" style="color:red;">Error al buscar clientes.</p>';
            showAlert('Error al buscar clientes.', "error");
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

    const handleLogin = async () => {
        if (!auth || !loginForm.usernameInput || !loginForm.password || !loginForm.loginButton || !db) {
            showAlert("Sistema de autenticación o base de datos no disponible. Intenta recargar.", "error");
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
            const userQuerySnapshot = await db.collection('users').where('username', '==', username).limit(1).get();

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
                case "auth/user-not-found":
                case "auth/invalid-credential":
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
            showAlert("Sistema de autenticación no disponible. Intenta recargar.", "error");
            console.error("Auth is not initialized.");
            return;
        }

        // Desconectamos cualquier listener activo ANTES de cerrar sesión.
        if (unsubscribeShiftListener) {
            unsubscribeShiftListener();
            unsubscribeShiftListener = null;
        }

        try {
            await auth.signOut();
            console.log("User signed out successfully. Explicitly showing login screen.");
            // La lógica para mostrar la pantalla de login ahora la maneja onAuthStateChanged.
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
        const authContainer = screens.recoverPassword.querySelector(".auth-container");
        if (!authContainer) {
            console.error("Auth container on recover screen not found.");
            return;
        }

        const existingEmailGroup = authContainer.querySelector(".form-group #reset-email-input")?.parentElement;
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
        authContainer.insertBefore(recoverForm.sendResetEmailButton, recoverForm.backToLoginLink);

        if (recoverForm.resetEmailInput) {
            recoverForm.resetEmailInput.value = "";
            recoverForm.resetEmailInput.focus();
        }
    };

    const sendPasswordResetEmail = async () => {
        if (!auth || !recoverForm.resetEmailInput || !recoverForm.sendResetEmailButton) {
            showAlert("Sistema de autenticación no disponible. Intenta recargar.", "error");
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
            showAlert(`Se ha enviado un email de recuperación a ${email}. Revisa tu bandeja de entrada.`, "success");
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
                    errorMessage = "Se han enviado demasiadas solicitudes de recuperación. Inténtalo más tarde.";
                    break;
                default:
                    errorMessage += ` (${error.message})`;
                    break;
            }
            showAlert(errorMessage, "error");
            recoverForm.resetEmailInput.focus();
        } finally {
            if (recoverForm.sendResetEmailButton) {
                recoverForm.sendResetEmailButton.disabled = false;
                recoverForm.sendResetEmailButton.textContent = "Enviar email de recuperación";
            }
            if (recoverForm.resetEmailInput) recoverForm.resetEmailInput.focus();
        }
    };

    const handleOpenCash = () => {
        if (!db || !currentUser) {
            showAlert("Base de datos o usuario no disponible. Intenta recargar.", "error");
            return;
        }
        if (cashRegisterOpen) {
            showAlert("La caja ya está abierta.", "info");
            return;
        }

        const initialCash = parseFloat(cuadreCajaUI.initialCashInput.value) || 0;
        const cashChange = parseFloat(cuadreCajaUI.cashChangeInput.value) || 0;
        
        if (isNaN(initialCash) || initialCash < 0 || isNaN(cashChange) || cashChange < 0) {
            showAlert("El efectivo inicial y el cambio deben ser números válidos y no negativos.", "warning");
            return;
        }
        if (initialCash === 0 && cashChange === 0) {
            showAlert("Debes ingresar un monto inicial o de cambio para abrir la caja.", "warning");
            return;
        }

        _performOpenCash(currentUser.uid, currentUser.username || currentUser.name, initialCash, cashChange);
    };

    const handleSaveEditedCartItem = () => {
        const modal = modals.editCartItem;
        if (!modal?.element || !modal.quantityInput || !modal.priceInput || !modal.saveButton) {
            console.error("Edit cart item modal elements not found for save.");
            return;
        }

        if (!editingCartItemId) {
            console.error("Attempted to save edited item but no editingCartItemId is set.");
            showAlert("Error interno: No se pudo identificar el item a guardar.", "error");
            return;
        }

        const itemToUpdate = cart.find((item) => item.id === editingCartItemId);
        if (!itemToUpdate) {
            console.error("Attempted to save edited item not found in cart:", editingCartItemId);
            showAlert("Error: Item no encontrado en el carrito.", "error");
            hideAllModals();
            return;
        }

        const newQuantity = parseInt(modal.quantityInput.value, 10);
        const newPrice = parseFloat(modal.priceInput.value);

        if (isNaN(newQuantity) || newQuantity < 1) {
            showAlert("La cantidad debe ser un número entero mayor o igual a 1.", "warning");
            modal.quantityInput.focus();
            return;
        }
        if (isNaN(newPrice) || newPrice < 0) {
            showAlert("El precio debe ser un número mayor o igual a 0.", "warning");
            modal.priceInput.focus();
            return;
        }

        const productInCache = productsCache.find((p) => p.id === editingCartItemId);
        const availableStock = productInCache?.stock ?? 0;

        if (newQuantity > availableStock) {
            showAlert(`No hay suficiente stock disponible. Solo quedan ${availableStock} unidades.`, "warning");
            modal.quantityInput.value = availableStock;
            modal.quantityInput.focus();
            return;
        }

        itemToUpdate.quantity = newQuantity;
        itemToUpdate.price = newPrice;

        console.log(`Updated cart item (ID: ${editingCartItemId}). New quantity: ${newQuantity}, New price: ${newPrice}`);

        cartDiscountType = 'none';
        cartDiscountValue = 0;
        cartDiscountAmount = 0;
        updateCartUI();
        hideAllModals();
    };
        const handleApplyHotDogPromo = () => {
        const hotDogItems = cart.filter(item => {
            const itemNameLower = (item.name || '').toLowerCase();
            return HOT_DOG_PRODUCT_NAMES_FOR_PROMO.some(promoNamePart => itemNameLower.includes(promoNamePart));
        });
        const totalHotDogQuantity = hotDogItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

        if (totalHotDogQuantity < 2) {
            showToast(`Añade al menos 2 Hot Dogs al carrito para aplicar la promoción 2 por ${HOT_DOG_PROMO_PRICE_PER_PAIR}.`, "warning");
            return;
        }

        if (cartDiscountType !== 'none' && cartDiscountType !== 'hotdog2x150') {
            showModal(modals.confirmAction, "Reemplazar Descuento", "Ya hay un descuento aplicado. ¿Deseas reemplazarlo con la promoción de Hot Dogs?", () => {
                cartDiscountType = 'hotdog2x150';
                cartDiscountValue = 0;
                updateCartUI();
                showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden');
            });
            return;
        }

        if (cartDiscountType === 'hotdog2x150') {
            showToast("La promoción de Hot Dogs ya está aplicada.", "info");
            return;
        }
        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, `aplicar promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)}`, () => {
                cartDiscountType = 'hotdog2x150';
                cartDiscountValue = 0;
                updateCartUI();
                showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden');
            });
        } else {
            cartDiscountType = 'hotdog2x150';
            cartDiscountValue = 0;
            updateCartUI();
            showToast(`Promoción 2 Hot Dogs por ${formatPrice(HOT_DOG_PROMO_PRICE_PER_PAIR)} aplicada.`, "success");
            ventasUI.applyPromoSection.classList.add('hidden');
        }
    };
    const handleApplyManualDiscount = () => {
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
                ventasUI.applyPromoSection.classList.add('hidden');
            });
            return;
        }

        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, `aplicar descuento ${type === 'percentage' ? value + '%' : formatPrice(value)}`, () => {
                cartDiscountType = type;
                cartDiscountValue = value;
                updateCartUI();
                showToast(`Descuento de ${type === 'percentage' ? value + '%' : formatPrice(value)} aplicado.`, "success");
                ventasUI.applyPromoSection.classList.add('hidden');
            });
        } else {
            cartDiscountType = type;
            cartDiscountValue = value;
            updateCartUI();
            showToast(`Descuento de ${type === 'percentage' ? value + '%' : formatPrice(value)} aplicado.`, "success");
            ventasUI.applyPromoSection.classList.add('hidden');
        }
    };

    const handleRecordPettyCashAddition = () => {
        if (!cashRegisterOpen) {
            showAlert('Caja cerrada. Abre la caja para registrar entradas de efectivo.', 'warning');
            return;
        }

        const description = salidaEntradaUI.addPettyCashDescriptionInput.value.trim();
        const amount = parseFloat(salidaEntradaUI.addPettyCashAmountInput.value);

        if (!description || isNaN(amount) || amount <= 0) {
            showAlert("Por favor, ingresa una descripción y un monto válido para la entrada de efectivo.", "warning");
            return;
        }

        if (currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'registrar entrada de efectivo', () => _performRecordCashMovement('addition', description, amount));
        } else {
            _performRecordCashMovement('addition', description, amount);
        }
    };

    const handleRecordOutput = () => {
        if (!cashRegisterOpen) {
            showAlert('Caja cerrada. Abre la caja para registrar salidas de efectivo.', 'warning');
            return;
        }

        const description = salidaEntradaUI.outputDescriptionInput.value.trim();
        const amount = parseFloat(salidaEntradaUI.outputAmountInput.value);

        if (!description || isNaN(amount) || amount <= 0) {
            showAlert("Por favor, ingresa una descripción y un monto válido para la salida de efectivo.", "warning");
            return;
        }

        if (currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'registrar salida de efectivo', () => _performRecordCashMovement('outflow', description, amount));
        } else {
            _performRecordCashMovement('outflow', description, amount);
        }
    };
        const handleProcessSale = async () => {
        if (!cashRegisterOpen) {
            showAlert('Caja cerrada. Abre la caja para registrar ventas.', 'warning');
            return;
        }

        if (!db || !currentUser || !cartUI.processSaleButton) {
            showAlert("La aplicación no está completamente cargada. Intenta recargar.", "error");
            return;
        }

        if (cart.length === 0) {
            showAlert("El carrito está vacío. Añade productos para procesar la venta.", "warning");
            return;
        }

        if (currentUser.isTeamAccount && currentShiftTeamMembers.length === 0) {
            showAlert("Por favor, configura los miembros del equipo para este turno antes de procesar ventas.", "warning");
            if (mainAppUI.setTeamMembersButton) mainAppUI.setTeamMembersButton.focus();
            return;
        }

        const method = cartUI.paymentMethodSelect.value;
        const subtotal = calculateCartSubtotal();
        const total = subtotal - cartDiscountAmount;
        const amountReceived = parseFloat(cartUI.amountReceivedInput.value ?? "0") || 0;

        if (method === "efectivo" && amountReceived < total) {
            showAlert("El monto recibido en efectivo es insuficiente.", "warning");
            cartUI.amountReceivedInput.focus();
            return;
        }

        if (method === "credito") {
            showModal(modals.creditAccount, total);
            return;
        }

        showModal(modals.customerName);
    };

    /**
     * Función final que procesa la venta después de obtener (u omitir) el nombre del cliente.
     * @param {string} customerName - El nombre del cliente (puede ser un string vacío).
     */
   const _finalizeSaleProcessing = async (customerName = '') => {
        hideAllModals();

        cartUI.processSaleButton.disabled = true;
        cartUI.processSaleButton.textContent = "Procesando...";

        const subtotal = calculateCartSubtotal();
        const discountAmount = cartDiscountAmount;
        const total = subtotal - discountAmount;
        const method = cartUI.paymentMethodSelect.value;
        const amountReceived = method === "efectivo" ? parseFloat(cartUI.amountReceivedInput.value ?? "0") || 0 : total;
        const cambio = method === "efectivo" ? Math.max(0, amountReceived - total) : 0;
        let totalProfit = 0;
        let totalHotdogCommissionForSale = 0;

        const saleItemsForFirestore = cart.map((item) => {
            const productData = productsCache.find(p => p.id === item.id);
            const costPriceAtTimeOfSale = productData?.costPrice ?? 0;
            const profitPerItem = (item.price - costPriceAtTimeOfSale) * item.quantity;
            totalProfit += profitPerItem;

            const isHotdog = HOT_DOG_PRODUCT_NAMES_FOR_COMMISSION.some(keyword => (item.name || '').toLowerCase().includes(keyword.toLowerCase()));

            if (isHotdog) {
                // ===================================
                // INICIO DE LA CORRECCIÓN DE COMISIÓN
                // ===================================
                if (currentUser.isTeamAccount && currentShiftTeamMembers.length > 0) {
                    // Para cuentas de equipo, leemos la tasa de comisión del propio usuario "Equipo"
                    const teamCommissionRate = currentUser.hotdogCommissionPerItem || 0;
                    totalHotdogCommissionForSale += (item.quantity * teamCommissionRate);
                } else if (!currentUser.isTeamAccount && currentUser.hotdogCommissionEnabled && currentUser.hotdogCommissionPerItem > 0) {
                    // Para cuentas individuales, se mantiene como estaba
                    totalHotdogCommissionForSale += (item.quantity * currentUser.hotdogCommissionPerItem);
                }
                // ===================================
                // FIN DE LA CORRECCIÓN DE COMISIÓN
                // ===================================
            }

            return {
                id: item.id,
                name: item.name || "Producto sin nombre",
                price: item.price ?? 0,
                costPriceAtTimeOfSale: costPriceAtTimeOfSale,
                profitPerItem: profitPerItem,
                quantity: item.quantity ?? 0
            };
        });
        const saleData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            localTimestamp: new Date(),
            vendedorId: currentUser.uid,
            vendedorNombre: currentUser.username || currentUser.name || "Desconocido",
            customerName: customerName.trim(),
            items: saleItemsForFirestore,
            subtotal,
            discountAmount,
            discountTypeApplied: cartDiscountType,
            discountValueApplied: cartDiscountValue,
            total,
            totalProfit,
            totalHotdogCommission: totalHotdogCommissionForSale,
            metodoPago: method,
            montoRecibido: amountReceived,
            cambio,
            shiftId: currentShiftId,
            shiftName: currentShiftName || null,
            annulled: false,
            shiftTeamMembers: currentUser.isTeamAccount ? currentShiftTeamMembers : []
        };
        
        const batch = db.batch();

        try {
            const saleDocRef = db.collection("sales").doc();
            const saleId = saleDocRef.id;
            const finalSaleDataForFirestore = { ...saleData, id: saleId };
            batch.set(saleDocRef, finalSaleDataForFirestore);

            for (const cartItem of cart) {
                const productRef = db.collection("products").doc(cartItem.id);
                batch.update(productRef, {
                    stock: firebase.firestore.FieldValue.increment(-cartItem.quantity)
                });
            }

            await batch.commit();
            showAlert(`Venta #${saleId.substring(0, 6)} procesada con éxito!`, "success");

            const invoiceHTML = generateInvoiceHTML(finalSaleDataForFirestore, true, false);
            showModal(modals.invoicePreview, `<pre>${invoiceHTML}</pre>`, saleId); 
            resetSaleAfterCompletion();

            loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect?.value);
            updateLowStockCount();
            updateCashDashboardTotals();

        } catch (error) {
            console.error("Error procesando venta:", error);
            if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos al registrar la venta. Revisa tus Security Rules.", "error");
            } else {
                showAlert("Error al procesar la venta. Intenta de nuevo.", "error");
            }
        } finally {
            cartUI.processSaleButton.textContent = "Procesar Venta";
            cartUI.processSaleButton.disabled = false;
        }
    };
        const handlePrintInvoice = (invoiceId) => {
        if (!invoiceId) {
            showAlert('No hay factura seleccionada para imprimir.', "warning");
            return;
        }
        db.collection('sales').doc(invoiceId).get()
            .then(doc => {
                if (doc.exists) {
                    const saleData = {
                        id: doc.id,
                        ...doc.data()
                    };
                    const isAdmin = currentUser && currentUser.role === "admin";
                    const invoiceTextCustomer = generateInvoiceHTML(saleData, true, false);
                    const invoiceTextInternal = generateInvoiceHTML(saleData, false, isAdmin);

                    printInvoiceContent(invoiceTextCustomer, "Factura de Cliente", BUSINESS_LOGO_URL, () => {
                        let finalInvoiceTextInternal = invoiceTextInternal;
                        const label = "\n\n        ****** COPIA PARA EL VENDEDOR ******\n\n";
                        const lastLineIndex = finalInvoiceTextInternal.lastIndexOf("----------------------------------");
                        if (lastLineIndex !== -1) {
                            finalInvoiceTextInternal = finalInvoiceTextInternal.substring(0, lastLineIndex) + label + finalInvoiceTextInternal.substring(lastLineIndex);
                        } else {
                            finalInvoiceTextInternal += label;
                        }
                        setTimeout(() => {
                            printInvoiceContent(finalInvoiceTextInternal, "Copia Interna de Factura", BUSINESS_LOGO_URL);
                        }, 500);
                    });
                } else {
                    showAlert('La factura no se encontró en la base de datos.', "error");
                }
            })
            .catch(error => {
                console.error("Error al obtener la factura para imprimir:", error);
                showAlert('Error al cargar la factura para imprimir.', "error");
            });
    };
    
    const handleAnnulInvoice = (invoiceId) => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido. Solo administradores pueden anular facturas.", "warning");
            return;
        }

        if (!invoiceId) {
            showAlert("No hay factura seleccionada para anular.", "warning");
            return;
        }

        showModal(modals.confirmAction,
            'Anular Factura',
            `¿Estás seguro de que quieres ANULAR la factura ID "${invoiceId.substring(0, 6)}..."? <br><strong>Esta acción es irreversible y NO devuelve productos al inventario.</strong>`,
            () => _performAnnulInvoice(invoiceId)
        );
    };

    const handleModifyInvoice = (invoiceId) => {
        if (!invoiceId) {
            console.error("Se intentó modificar la factura, pero no se proporcionó un ID.");
            showAlert("Error: No se pudo identificar la factura a modificar.", "error");
            return;
        }

        if (currentUser && currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'modificar factura', () => simulateModifyInvoice(invoiceId));
        } else {
            simulateModifyInvoice(invoiceId);
        }
    };

    const handleSaveProduct = async () => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }
        if (!db) {
            showAlert("Base de datos no disponible.", "error");
            return;
        }
        const modal = modals.product;
        if (!modal?.element || !modal.nameInput || !modal.codeInput || !modal.priceInput || !modal.costInput || !modal.stockInput || !modal.categoryInput || !modal.saveButton) {
            console.error("Elementos del modal de producto no encontrados.");
            return;
        }

        const name = modal.nameInput.value.trim();
        const code = modal.codeInput.value.trim();
        const price = parseFloat(modal.priceInput.value);
        const costPrice = parseFloat(modal.costInput.value);
        const stock = parseInt(modal.stockInput.value, 10);
        const category = modal.categoryInput.value.trim();

        if (!name || !code || isNaN(price) || price < 0 || isNaN(costPrice) || costPrice < 0 || isNaN(stock) || stock < 0 || !category) {
            showAlert("Por favor, completa todos los campos correctamente (Nombre, Código, Precio Venta >= 0, Costo >= 0, Stock >= 0, Categoría).", "error");
            return;
        }

        const productData = {
            name,
            code: code.toUpperCase(),
            price,
            costPrice,
            stock,
            category
        };
        productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        modal.saveButton.disabled = true;
        modal.saveButton.textContent = editingProductId ? "Actualizando..." : "Guardando...";

        try {
            if (editingProductId) {
                await db.collection("products").doc(editingProductId).update(productData);
                showToast("Producto actualizado con éxito.", "success");
            } else {
                if (productsCache.length === 0) {
                    await loadProductsFromFirestore();
                }
                const existingProduct = productsCache.find((p) => p.code?.toUpperCase() === code.toUpperCase());
                if (existingProduct) {
                    showAlert(`Ya existe un producto con el código "${code.toUpperCase()}".`, "warning");
                    modal.saveButton.disabled = false;
                    modal.saveButton.textContent = "Guardar";
                    modal.codeInput.focus();
                    return;
                }
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("products").add(productData);
                showToast("Producto añadido con éxito.", "success");
            }
            hideAllModals();
            loadInventoryFromFirestore();
            if (document.getElementById("ventas-section")?.classList.contains("active") && ventasUI.productSearchInput) {
                loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value);
            }
            updateLowStockCount();
        } catch (error) {
            console.error("Error al guardar el producto:", error);
            if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos al guardar/actualizar el producto.", "error");
            } else {
                showAlert("Error al guardar el producto.", "error");
            }
        } finally {
            if (modal.saveButton) {
                modal.saveButton.disabled = false;
                modal.saveButton.textContent = editingProductId ? "Actualizar" : "Guardar";
            }
        }
    };
        const handleSaveUser = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!db) {
            showAlert('Base de datos no disponible.', "error");
            return;
        }
        const modal = modals.user;
        if (!modal?.element || !modal.nameInput || !modal.usernameInput || !modal.emailInput || !modal.idInput || !modal.roleSelect ||
            !modal.generalCommissionEnabledCheckbox || !modal.generalCommissionAmountInput ||
            !modal.hotdogCommissionEnabledCheckbox || !modal.hotdogCommissionPerItemInput ||
            !modal.isTeamAccountCheckbox || !modal.saveButton) {
            console.error("Elementos del modal de usuario no encontrados.");
            return;
        }

        const name = modal.nameInput.value.trim();
        const username = modal.usernameInput.value.trim();
        const email = modal.emailInput.value.trim();
        const uid = modal.idInput.value.trim();
        const role = modal.roleSelect.value;

        if (editingUserId === currentUser.uid && role !== 'admin') {
            showAlert('No puedes cambiar tu propio rol. Perderías el acceso de administrador.', 'error', 5000);
            modal.roleSelect.value = 'admin';
            return;
        }

        const generalCommissionEnabled = modal.generalCommissionEnabledCheckbox.checked;
        const generalCommissionAmount = generalCommissionEnabled ? parseFloat(modal.generalCommissionAmountInput.value) : 0;
        const hotdogCommissionEnabled = modal.hotdogCommissionEnabledCheckbox.checked;
        const hotdogCommissionPerItem = hotdogCommissionEnabled ? parseFloat(modal.hotdogCommissionPerItemInput.value) : 0;
        const isTeamAccount = modal.isTeamAccountCheckbox.checked;

        if (!name || !username || !uid || !email) {
            showAlert('Por favor, ingresa el nombre, nombre de usuario, email y el UID del usuario.', "warning");
            return;
        }
        if (generalCommissionEnabled && (isNaN(generalCommissionAmount) || generalCommissionAmount < 0)) {
            showAlert('El monto de la comisión general debe ser un número válido (>= 0).', "warning");
            modal.generalCommissionAmountInput.focus();
            return;
        }
        if (hotdogCommissionEnabled && (isNaN(hotdogCommissionPerItem) || hotdogCommissionPerItem < 0)) {
            showAlert('El monto de la comisión por hotdog debe ser un número válido (>= 0).', "warning");
            modal.hotdogCommissionPerItemInput.focus();
            return;
        }
        const userData = {
            name: name,
            username: username,
            email: email,
            role: role,
            generalCommissionEnabled: generalCommissionEnabled,
            generalCommissionAmount: generalCommissionAmount,
            hotdogCommissionEnabled: hotdogCommissionEnabled,
            hotdogCommissionPerItem: hotdogCommissionPerItem,
            isTeamAccount: isTeamAccount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        modal.saveButton.disabled = true;
        modal.saveButton.textContent = editingUserId ? 'Actualizando...' : 'Guardando...';

        try {
            const userDocRef = db.collection('users').doc(uid);
            const userDoc = await userDocRef.get();

            if (editingUserId) {
                if (userDoc.exists && (userDoc.data().username !== username || userDoc.data().email !== email)) {
                    const existingUsernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
                    if (!existingUsernameQuery.empty && existingUsernameQuery.docs[0].id !== uid) {
                        showAlert(`Ya existe otro usuario con el nombre de usuario "${username}".`, "warning");
                        modal.saveButton.disabled = false;
                        modal.saveButton.textContent = 'Actualizar';
                        modal.usernameInput.focus();
                        return;
                    }
                    const existingEmailQuery = await db.collection('users').where('email', '==', email).limit(1).get();
                    if (!existingEmailQuery.empty && existingEmailQuery.docs[0].id !== uid) {
                        showAlert(`Ya existe otro usuario con el email "${email}".`, "warning");
                        modal.saveButton.disabled = false;
                        modal.saveButton.textContent = 'Actualizar';
                        modal.emailInput.focus();
                        return;
                    }
                }
                if (!userDoc.exists) {
                    showAlert(`Error: El usuario con UID ${uid} no existe.`, "error");
                    return;
                }
                await userDocRef.update(userData);
                showAlert('Metadatos de usuario actualizados con éxito.', "success");
            } else {
                const existingUsernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
                if (!existingUsernameQuery.empty) {
                    showAlert(`Ya existe un usuario con el nombre de usuario "${username}".`, "warning");
                    modal.saveButton.disabled = false;
                    modal.saveButton.textContent = 'Guardar';
                    modal.usernameInput.focus();
                    return;
                }
                const existingEmailQuery = await db.collection('users').where('email', '==', email).limit(1).get();
                if (!existingEmailQuery.empty) {
                    showAlert(`Ya existe un usuario con el email "${email}".`, "warning");
                    modal.saveButton.disabled = false;
                    modal.saveButton.textContent = 'Guardar';
                    modal.emailInput.focus();
                    return;
                }
                if (userDoc.exists) {
                    showAlert(`Ya existen metadatos para este UID (${uid}).`, "warning");
                    return;
                }
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("users").doc(uid).set(userData);
                showAlert('Metadatos de usuario añadidos con éxito.', "success");
            }

            hideAllModals();
            loadUsersForManagement();
            if (currentUser && currentUser.uid === uid) {
                Object.assign(currentUser, userData);
                mainAppUI.currentUserDisplay.name.textContent = currentUser.username || currentUser.name || currentUser.email || "Usuario";
                updateUIVisibilityBasedOnRole();
                if (mainAppUI.setTeamMembersButton) {
                    mainAppUI.setTeamMembersButton.classList.toggle('hidden', !currentUser.isTeamAccount);
                }
            }
        } catch (error) {
            console.error("Error al guardar el usuario:", error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showAlert('Error de permisos al guardar/actualizar usuario.', "error");
            } else {
                showAlert('Error al guardar el usuario. Asegúrate de que el UID de Firebase Auth sea correcto.', "error");
            }
        } finally {
            modal.saveButton.disabled = false;
            modal.saveButton.textContent = editingUserId ? 'Actualizar' : 'Guardar';
        }
    };
        const handleSetTeamMembers = () => {
        const modal = modals.setTeamMembers;
        if (!modal || !modal.shiftNameInput || !modal.teamMembersList || !modal.saveButton) {
            console.error("Set team members modal elements not found.");
            return;
        }

        const selectedMembers = [];
        modal.teamMembersList.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selectedMembers.push(checkbox.value);
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
    };

    const handleRecordInventoryMovement = async () => {
        if (!cashRegisterOpen) {
            showToast('Caja cerrada. Abre la caja para registrar movimientos de inventario.', "warning");
            return;
        }
        if (!db || !modals.inventoryMovement.productSelect || !modals.inventoryMovement.typeSelect || !modals.inventoryMovement.quantityInput || !modals.inventoryMovement.descriptionInput || !modals.inventoryMovement.saveButton) {
            showToast('La aplicación no está completamente cargada. Intenta recargar.', "error");
            return;
        }

        const productId = modals.inventoryMovement.productSelect.value;
        const type = modals.inventoryMovement.typeSelect.value;
        const quantity = parseInt(modals.inventoryMovement.quantityInput.value, 10);
        const description = modals.inventoryMovement.descriptionInput.value.trim();

        if (!productId) {
            showToast('Por favor, selecciona un Producto.', "warning");
            modals.inventoryMovement.productSelect.focus();
            return;
        }
        if (isNaN(quantity) || quantity <= 0) {
            showToast('Por favor, ingresa una Cantidad válida.', "warning");
            modals.inventoryMovement.quantityInput.focus();
            return;
        }
        if (!description) {
            showToast('Por favor, ingresa una Descripción.', "warning");
            modals.inventoryMovement.descriptionInput.focus();
            return;
        }

        const productInCache = productsCache.find(p => p.id === productId);
        if (!productInCache) {
            showToast('Producto no encontrado. Recarga la página.', "error");
            return;
        }

        if (type.startsWith('out') && quantity > productInCache.stock) {
            showToast(`No hay suficiente stock para "${productInCache.name}". Stock: ${productInCache.stock}`, "warning");
            return;
        }

        modals.inventoryMovement.saveButton.disabled = true;
        modals.inventoryMovement.saveButton.textContent = 'Registrando...';

        const movementData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            productId,
            productName: productInCache.name,
            type,
            quantity,
            description,
            recordedBy: {
                id: currentUser.uid,
                name: currentUser.username || currentUser.name || 'Desconocido'
            },
            shiftId: currentShiftId,
            shiftName: currentShiftName || null,
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
            showToast('Movimiento de inventario registrado.', "success");
            modals.inventoryMovement.productSelect.value = '';
            modals.inventoryMovement.typeSelect.value = 'in';
            modals.inventoryMovement.quantityInput.value = '';
            modals.inventoryMovement.descriptionInput.value = '';
            hideAllModals();

            loadInventoryFromFirestore();
        } catch (error) {
            console.error('Error registrando movimiento de inventario:', error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                showToast('Error de permisos al registrar movimiento.', "error");
            } else {
                showToast('Error al registrar movimiento de inventario.', "error");
            }
        } finally {
            modals.inventoryMovement.saveButton.disabled = false;
            modals.inventoryMovement.saveButton.textContent = 'Registrar Movimiento';
        }
    };

    const handleRecordPayment = (customer) => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido. Solo administradores.", "warning");
            return;
        }

        if (!db) {
            showAlert("Base de datos no disponible.", "error");
            return;
        }

        showModal(modals.recordPayment, customer);
    };

    const handleCashBalance = () => {
        if (!cashRegisterOpen) {
            showAlert('La caja está cerrada. Ábrela para hacer un cuadre.', 'warning');
            return;
        }
        if (currentUser.role === 'colaborator') {
            showModal(modals.adminCode, 'realizar cuadre de caja', () => _performCashBalance(false));
        } else {
            _performCashBalance(false);
        }
    };
     // =======================================================
    //          ===>    PEGA TODO EL BLOQUE AQUÍ    <===
    // =======================================================
    const showAdminManageCashboxModal = (user) => {
        selectedUserForCashbox = user; // Guardamos el usuario seleccionado
        const modal = modals.adminManageCashbox;
        modal.title.textContent = `Gestionar Caja de ${user.name || user.username}`;
        
        const isOpen = user.isCashRegisterOpen;
        modal.status.innerHTML = `Estado actual: <span class="status-indicator ${isOpen ? 'online' : 'offline'}">${isOpen ? 'Abierta' : 'Cerrada'}</span>`;

        // Mostrar/ocultar botones según el estado
        modal.forceOpenBtn.classList.toggle('hidden', isOpen);
        modal.addCashBtn.classList.toggle('hidden', !isOpen);
        modal.removeCashBtn.classList.toggle('hidden', !isOpen);
        modal.forceCloseBtn.classList.toggle('hidden', !isOpen);

        showModal(modal);
    }

    const _adminPerformRecordCashMovement = async (type, targetUserId, targetShiftId) => {
        const title = type === 'addition' ? 'Añadir Fondos' : 'Retirar Fondos';
        const amount = parseFloat(prompt(`Ingrese el monto a ${type === 'addition' ? 'añadir' : 'retirar'}:`));
        if (isNaN(amount) || amount <= 0) {
            showAlert("Monto inválido.", "error"); return;
        }
        const description = prompt(`Descripción del movimiento:`, `Movimiento de admin`);
        if (!description) {
            showAlert("Se requiere una descripción.", "error"); return;
        }

        showToast("Procesando...", "info");
        const movementData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: type,
            description,
            amount,
            recordedBy: { id: currentUser.uid, name: currentUser.username },
            shiftId: targetShiftId,
        };

        try {
            await db.collection('cashMovements').add(movementData);
            showToast("Movimiento registrado con éxito.", "success");
        } catch (error) {
            console.error("Error registrando movimiento de admin:", error);
            showAlert("Error al registrar el movimiento.", "error");
        }
    };
    // =======================================================
    const handleCloseCash = () => {
        if (!cashRegisterOpen) {
            showAlert('La caja ya está cerrada.', 'info');
            return;
        }
        showModal(modals.confirmAction,
            'Confirmar Cierre de Caja',
            `¿Estás seguro de que quieres cerrar la caja? Esto realizará un cuadre final y terminará el turno actual. <strong>Esta acción no se puede deshacer.</strong>`,
            () => {
                if (currentUser.role === 'colaborator') {
                    showModal(modals.adminCode, 'cerrar caja y finalizar turno', () => _performCashBalance(true));
                } else {
                    _performCashBalance(true);
                }
            }
        );
    };
        const handleSearchInvoice = async () => {
        if (!db || !cuadreCajaUI.searchInvoiceInput || !modals.invoicePreview?.content) {
            showAlert('La aplicación no está cargada.', 'error');
            return;
        }

        const searchTerm = cuadreCajaUI.searchInvoiceInput.value.trim();
        if (!searchTerm) {
            showAlert('Por favor, ingresa un ID de factura para buscar.', "warning");
            cuadreCajaUI.searchInvoiceInput.focus();
            return;
        }

        cuadreCajaUI.searchInvoiceButton.disabled = true;
        cuadreCajaUI.searchInvoiceButton.textContent = 'Buscando...';

        try {
            const invoiceDocById = await db.collection('sales').doc(searchTerm).get();
            if (invoiceDocById.exists) {
                const saleData = { id: invoiceDocById.id, ...invoiceDocById.data() };
                const isAdmin = currentUser && currentUser.role === "admin";
                const invoiceText = generateInvoiceHTML(saleData, !isAdmin, isAdmin);
                showModal(modals.invoicePreview, `<pre>${invoiceText}</pre>`, searchTerm);
                return;
            }

            showAlert(`No se encontraron facturas para el ID "${searchTerm}".`, 'warning');

        } catch (error) {
            console.error("Error buscando factura:", error);
            showAlert('Error al buscar la factura.', "error");
        } finally {
            cuadreCajaUI.searchInvoiceButton.disabled = false;
            cuadreCajaUI.searchInvoiceButton.textContent = 'Buscar Factura';
        }
    };
    
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

    // --- Funciones de Renderizado ---
    const showSection = (sectionValue) => {
        const navLink = document.querySelector(`.nav-list a[data-section="${sectionValue}"]`);
        const isNavLinkAdminOnly = navLink?.parentElement?.classList.contains("admin-only");

        if (isNavLinkAdminOnly && (!currentUser || currentUser.role !== "admin")) {
            showAlert("Acceso restringido. Solo administradores.", "warning");
            const activeSection = document.querySelector(".content-section.active");
            if (!activeSection) {
                showSection("ventas");
            }
            return;
        }

        hideAllModals();

        if (salesByCategoryChartInstance) salesByCategoryChartInstance.destroy();
        if (paymentMethodsChartInstance) paymentMethodsChartInstance.destroy();
        if (salesTrendChartInstance) salesTrendChartInstance.destroy();
        if (commissionStackedBarChartInstance) commissionStackedBarChartInstance.destroy();
        if (accountsReceivableChart) accountsReceivableChart.destroy();

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
                if (ventasUI.applyPromoSection) ventasUI.applyPromoSection.classList.add('hidden');
                updateCashRegisterUIState();
                break;
            case "inventario":
                loadInventoryFromFirestore();
                updateCashRegisterUIState();
                break;
            case "usuarios":
                loadUsersForManagement();
                updateCashRegisterUIState();
                break;
            case "cuadrecaja":
                if (cuadreCajaUI.cashChangeInput && cuadreCajaUI.initialCashInput) {
                    updateCashTotals();
                }
                updateCashDashboardTotals();
                if (cuadreCajaUI.reportDetailsContainer)
                    cuadreCajaUI.reportDetailsContainer.innerHTML =
                    '<p class="placeholder-text">Selecciona un rango de fechas para generar el reporte o busca una factura por ID.</p>';
                const today = new Date();
                cuadreCajaUI.reportStartDate.valueAsDate = today;
                cuadreCajaUI.reportEndDate.valueAsDate = today;
                if (cuadreCajaUI.searchInvoiceInput)
                    cuadreCajaUI.searchInvoiceInput.value = "";
                currentReportData = null;
                if (productsCache.length === 0) loadProductsFromFirestore();
                updateCashRegisterUIState();
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
                updateCashRegisterUIState();
                break;
            case "admin-reports":
                if (!currentUser || currentUser.role !== "admin") {
                    showAlert("Acceso restringido. Solo administradores.", "warning");
                    showSection("ventas");
                    return;
                }
                const adminReportToday = new Date();
                if (adminReportsUI.reportStartDate) adminReportsUI.reportStartDate.valueAsDate = adminReportToday;
                if (adminReportsUI.reportEndDate) adminReportsUI.reportEndDate.valueAsDate = adminReportToday;
                if (adminReportsUI.employeeSelect) populateEmployeeSelectForAdminReports();
                if (adminReportsUI.adminReportContainer) adminReportsUI.adminReportContainer.innerHTML = '<p class="placeholder-text">Selecciona un rango de fechas y opciones para generar el reporte de administrador.</p>';
                if (adminReportsUI.printAdminReportButton) adminReportsUI.printAdminReportButton.classList.add("hidden");
                currentReportData = null;
                if (productsCache.length === 0) loadProductsFromFirestore();
                updateCashRegisterUIState();

                setupAccordion(adminReportsUI.summaryHeader, adminReportsUI.summaryContent);
                setupAccordion(adminReportsUI.commissionsHeader, adminReportsUI.commissionsContent);
                setupAccordion(adminReportsUI.cashBalancesHeader, adminReportsUI.cashBalancesContent);
                setupAccordion(adminReportsUI.accountsReceivableHeader, adminReportsUI.accountsReceivableContent);
                setupAccordion(adminReportsUI.salesDetailsHeader, adminReportsUI.salesDetailsContent);

                break;
                 // =============================================
            //      AÑADE ESTE NUEVO CASE
            // =============================================
            case "cuentas":
                if (!currentUser || currentUser.role !== "admin") {
                    showAlert("Acceso restringido. Solo administradores.", "warning");
                    showSection("ventas");
                    return;
                }
                loadAccountsReceivable();
                break;
            // =============================================
            default:
                console.warn("Unknown section value:", sectionValue);
                showSection("ventas");
                return;
        }

        if (sectionValue !== "ventas" && cart.length > 0) {
            console.log("Clearing cart due to section change away from sales.");
            showToast("Carrito limpiado al cambiar de sección.", "info");
            cart = [];
            cartDiscountType = 'none';
            cartDiscountValue = 0;
            cartDiscountAmount = 0;
            updateCartUI();
            resetSaleAfterCompletion();
        }
    };
        const renderInventoryTable = (itemsToRender) => {
        const listContainer = inventarioUI.listContainer;
        if (!listContainer) {
            console.error("Contenedor de lista de inventario no encontrado.");
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
                    ${isAdmin ? '<th data-label="Costo">Costo</th>' : ''}
                    ${isAdmin ? '<th data-label="Ganancia">Ganancia</th>' : ''}
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
            const profitMargin = price - cost;

            tr.innerHTML = `
                <td data-label="Código">${item.code || 'N/A'}</td>
                <td data-label="Nombre">${item.name || 'Sin Nombre'}</td>
                <td data-label="Categoría">${item.category || 'N/A'}</td>
                <td data-label="Precio Venta">${formatPrice(price)}</td>
                ${isAdmin ? `<td data-label="Costo">${formatPrice(cost)}</td>` : ''}
                ${isAdmin ? `<td data-label="Ganancia">${formatPrice(profitMargin)}</td>` : ''}
                <td data-label="Stock">${stockDisplay}</td>
                <td class="table-actions">
                    <button class="button-secondary small edit-product-button" data-id="${item.id}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-edit"></i> Editar</button>
                    <button class="button-danger small delete-product-button" data-id="${item.id}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;

            const editButton = tr.querySelector('.edit-product-button');
            if (editButton && isAdmin) {
                editButton.addEventListener('click', () => {
                    showModal(modals.adminCode, 'editar producto', () => showModal(modals.product, 'edit', item));
                });
            }
            const deleteButton = tr.querySelector('.delete-product-button');
            if (deleteButton && isAdmin) {
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
                listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Base de datos no disponible.</p>';
            console.error("DB o contenedor de lista de inventario no inicializado.");
            return;
        }

        listContainer.innerHTML = '<p class="placeholder-text">Cargando inventario...</p>';
        try {
            console.log("Obteniendo productos de inventario de Firestore...");
            const snapshot = await db.collection("products").orderBy("name").get();
            productsCache = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Se obtuvieron ${productsCache.length} productos.`);

            updateLowStockCount();

            renderInventoryTable(productsCache);
            populateProductSelectForInventoryMovements();
            renderRecentInventoryMovements();
        } catch (error) {
            console.error("Error al cargar el inventario:", error);
            if (listContainer) {
                if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado.</p>';
                } else {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar inventario.</p>';
                    showAlert("No se pudo cargar el inventario.", "error");
                }
            }
            productsCache = [];
            updateLowStockCount();
        }
    };

    const confirmDeleteProduct = (product) => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }
        if (!modals.confirmAction?.element) {
            console.error("Modal de confirmación no encontrado.");
            return;
        }
        if (!product || !product.id) {
            console.error("Intento de eliminar producto con ID faltante:", product);
            showAlert("Error: Información del producto incompleta.", "error");
            return;
        }

        showModal(
            modals.confirmAction,
            "Confirmar Eliminación",
            `¿Estás seguro de que quieres eliminar "${product.name || "Producto"}"? Esta acción no se puede deshacer.`,
            async () => {
                if (!db) {
                    showAlert("Base de datos no disponible.", "error");
                    return;
                }
                try {
                    await db.collection("products").doc(product.id).delete();
                    showAlert("Producto eliminado con éxito.", "success");
                    loadInventoryFromFirestore();
                    if (document.getElementById("ventas-section")?.classList.contains("active") && ventasUI.productSearchInput) {
                        loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value);
                    }
                    updateLowStockCount();
                } catch (error) {
                    console.error("Error al eliminar el producto:", error);
                    if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                        showAlert("Error de permisos al eliminar producto.", "error");
                    } else {
                        showAlert("Error al eliminar el producto.", "error");
                    }
                }
            }
        );
    };
       const renderUsersTable = (usersToRender) => {
        const listContainer = usuariosUI.listContainer;
        if (!listContainer) { return; }
        listContainer.innerHTML = "";

        if (usersToRender.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">No hay usuarios registrados.</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.role === 'admin';
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Caja</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        usersToRender.forEach(user => {
            if (user.uid === currentUser.uid && !isAdmin) return; // No mostrarse a sí mismo si no es admin

            const tr = tbody.insertRow();
            const isCashboxOpen = user.isCashRegisterOpen || false;

            tr.innerHTML = `
                <td data-label="Nombre">${user.name || 'Sin Nombre'}</td>
                <td data-label="Nombre de Usuario">${user.username || 'N/A'}</td>
                <td data-label="Email">${user.email || 'N/A'}</td>
                <td data-label="Rol">${user.role || 'N/A'}</td>
                <td data-label="Caja"><span class="status-indicator ${isCashboxOpen ? 'online' : 'offline'}">${isCashboxOpen ? 'Abierta' : 'Cerrada'}</span></td>
                <td class="table-actions">
                    <button class="button-secondary small edit-user-button" data-uid="${user.uid}">Editar</button>
                    ${isAdmin && user.uid !== currentUser.uid ? `<button class="button-primary small manage-cashbox-button" data-uid="${user.uid}">Gestionar Caja</button>` : ''}
                    ${isAdmin && user.uid !== currentUser.uid ? `<button class="button-danger small delete-user-button" data-uid="${user.uid}">Eliminar</button>` : ''}
                </td>
            `;

            tr.querySelector('.edit-user-button')?.addEventListener('click', () => showModal(modals.user, 'edit', user));
            tr.querySelector('.delete-user-button')?.addEventListener('click', () => confirmDeleteUser(user));
            tr.querySelector('.manage-cashbox-button')?.addEventListener('click', () => showAdminManageCashboxModal(user));
        });

        listContainer.appendChild(table);
    };

    const loadUsersForManagement = async () => {
        const listContainer = usuariosUI.listContainer;
        if (!db || !listContainer) {
            if (listContainer) listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Base de datos no disponible.</p>';
            console.error("DB o contenedor de lista de usuarios no inicializado.");
            return;
        }
        if (!currentUser || currentUser.role !== 'admin') {
            listContainer.innerHTML = '<p class="placeholder-text">Acceso restringido.</p>';
            return;
        }

        listContainer.innerHTML = '<p class="placeholder-text">Cargando usuarios...</p>';
        try {
            const snapshot = await db.collection('users').orderBy('name').get();
            const users = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            renderUsersTable(users);
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            if (listContainer) {
                if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado.</p>';
                } else {
                    listContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar usuarios.</p>';
                    showAlert('No se pudieron cargar los usuarios.', "error");
                }
            }
        }
    };
        const confirmDeleteUser = (userToDelete) => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!modals.confirmAction?.element) {
            console.error("Confirm modal not found.");
            return;
        }
        if (!userToDelete || !userToDelete.uid) {
            console.error("Intento de eliminar usuario con UID faltante:", userToDelete);
            showAlert("Error: Información de usuario incompleta.", "error");
            return;
        }

        if (userToDelete.uid === currentUser.uid) {
            showAlert("No puedes eliminar tu propio usuario de administrador.", "warning");
            return;
        }

        showModal(modals.confirmAction,
            'Confirmar Eliminación de Usuario',
            `¿Estás seguro de que quieres eliminar al usuario "${userToDelete.name || userToDelete.email}"? Esta acción eliminará sus metadatos de la base de datos, pero NO la cuenta de autenticación de Firebase.`,
            async () => {
                if (!db) {
                    showAlert("Base de datos no disponible.", "error");
                }
                try {
                    await db.collection('users').doc(userToDelete.uid).delete();
                    showAlert('Metadatos de usuario eliminados con éxito.', "success");
                    loadUsersForManagement();
                } catch (error) {
                    console.error('Error eliminando usuario:', error);
                    if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                        showAlert('Error de permisos al eliminar usuario.', "error");
                    } else {
                        showAlert('Error al eliminar el usuario.', "error");
                    }
                }
            }
        );
    };

    const renderRecentCashMovements = async () => {
        const container = salidaEntradaUI.cashMovementsHistoryContainer;
        if (!db || !currentUser || !container) {
            if (container)
                container.innerHTML = '<p class="placeholder-text">Acceso restringido.</p>';
            return;
        }

            const renderRecentCashMovements = async () => {
        const container = salidaEntradaUI.cashMovementsHistoryContainer;
        if (!db || !currentUser || !container) {
            if (container) container.innerHTML = '<p class="placeholder-text">Acceso no disponible.</p>';
            return;
        }

        // ===================================
        // INICIO DE LA MODIFICACIÓN
        // ===================================
        if (!cashRegisterOpen || !currentShiftId) {
            container.innerHTML = '<p class="placeholder-text">Abra la caja para ver los movimientos del turno actual.</p>';
            return;
        }
        // ===================================
        // FIN DE LA MODIFICACIÓN
        // ===================================

        container.innerHTML = '<p class="placeholder-text">Cargando movimientos del turno...</p>';

        try {
            // ===================================
            // INICIO DE LA MODIFICACIÓN
            // ===================================
            const snapshot = await db.collection("cashMovements")
                .where("shiftId", "==", currentShiftId) // <-- Filtra solo por el turno actual
                .orderBy("timestamp", "desc")
                .get();
            // ===================================
            // FIN DE LA MODIFICACIÓN
            // ===================================

            const movements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            container.innerHTML = "";

            if (movements.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No hay movimientos de caja en este turno.</p>';
                return;
            }

            const isAdmin = currentUser && currentUser.role === "admin";
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Fecha/Hora</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        ${isAdmin ? '<th>Registrado Por</th>' : ''}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            movements.forEach((move) => {
                const moveDate = move.timestamp?.toDate().toLocaleString("es-DO") ?? "N/A";
                const recordedByName = move.recordedBy?.name || "Desconocido";
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

        } catch (error) {
            console.error("Error loading recent cash movements:", error);
            container.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar movimientos.</p>';
        }
    };
    };
     const renderRecentInventoryMovements = async () => {
        const container = inventarioUI.inventoryMovementsHistoryContainer;
        if (!db || !currentUser || !container) {
            if (container) container.innerHTML = '<p class="placeholder-text">Acceso no disponible.</p>';
            return;
        }

        // ===================================
        // INICIO DE LA MODIFICACIÓN
        // ===================================
        if (!cashRegisterOpen || !currentShiftId) {
            container.innerHTML = '<p class="placeholder-text">Abra la caja para ver los movimientos de inventario del turno.</p>';
            return;
        }
        // ===================================
        // FIN DE LA MODIFICACIÓN
        // ===================================

        container.innerHTML = '<p class="placeholder-text">Cargando movimientos de inventario del turno...</p>';

        try {
            // ===================================
            // INICIO DE LA MODIFICACIÓN
            // ===================================
            const snapshot = await db.collection("inventoryMovements")
                .where("shiftId", "==", currentShiftId) // <-- Filtra solo por el turno actual
                .orderBy("timestamp", "desc")
                .get();
            // ===================================
            // FIN DE LA MODIFICACIÓN
            // ===================================

            const movements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            container.innerHTML = "";

            if (movements.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No hay movimientos de inventario en este turno.</p>';
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
                        ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            movements.forEach((move) => {
                const moveDate = move.timestamp && typeof move.timestamp.toDate === "function" ?
                    move.timestamp.toDate().toLocaleString("es-DO") :
                    "N/A";
                const recordedByName = move.recordedBy?.name || "Desconocido";

                let typeDisplay = '';
                let quantityDisplay = '';
                if (move.type === 'in') {
                    typeDisplay = 'Entrada';
                    quantityDisplay = `+${move.quantity ?? 0}`;
                } else if (move.type === 'out_waste') {
                    typeDisplay = 'Merma/Daño';
                    quantityDisplay = `-${move.quantity ?? 0}`;
                } else if (move.type === 'out_use') {
                    typeDisplay = 'Uso Interno';
                    quantityDisplay = `-${move.quantity ?? 0}`;
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
                if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Acceso denegado.</p>';
                } else {
                    container.innerHTML = '<p class="placeholder-text" style="color:red;">Error al cargar movimientos.</p>';
                    showAlert("No se pudieron cargar los movimientos de inventario.", "error");
                }
            }
        }
    };

    const generateCashReport = async () => {
        if (!db || !cuadreCajaUI.reportStartDate || !cuadreCajaUI.reportEndDate || !cuadreCajaUI.initialPettyCashInput || !cuadreCajaUI.reportDetailsContainer || !cuadreCajaUI.generateReportButton || !cuadreCajaUI.printReportButton) {
            showAlert("La aplicación no está cargada. Intenta recargar.", "error");
            return;
        }

        const startDateInput = cuadreCajaUI.reportStartDate.value;
        const endDateInput = cuadreCajaUI.reportEndDate.value;
        const initialPettyCash = parseFloat(cuadreCajaUI.initialPettyCashInput.value) || 0;

        if (!startDateInput || !endDateInput) {
            showAlert("Por favor, selecciona un rango de fechas.", "warning");
            return;
        }
        if (startDateInput > endDateInput) {
            showAlert("La fecha de inicio no puede ser posterior a la fecha de fin.", "warning");
            return;
        }

        const {
            start: queryStartTimestamp,
            end: queryEndTimestamp
        } = getBusinessDateRange(startDateInput, endDateInput);

        if (cuadreCajaUI.reportDetailsContainer)
            cuadreCajaUI.reportDetailsContainer.innerHTML = '<p class="placeholder-text">Generando reporte...</p>';
        if (cuadreCajaUI.generateReportButton) {
            cuadreCajaUI.generateReportButton.disabled = true;
            cuadreCajaUI.generateReportButton.textContent = "Generando...";
        }

        try {
            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data()
            }));

            if (productsCache.length === 0) {
                const productsSnapshot = await db.collection("products").get();
                productsCache = productsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            const salesSnapshot = await db.collection("sales")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc")
                .get();

            const sales = salesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            const movementsSnapshot = await db.collection("cashMovements")
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

            const inventoryMovementsSnapshot = await db.collection("inventoryMovements")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc")
                .get();

            const inventoryMovements = inventoryMovementsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            let totalSales = 0,
                totalDiscount = 0,
                totalCashIn = 0,
                totalCardIn = 0,
                totalTransferenciaIn = 0,
                totalCreditoIn = 0,
                totalOtroIn = 0,
                totalCashAdditions = 0,
                totalCashOut = 0,
                totalGrossProfit = 0;

            const salesByEmployee = {};
            const individualCommissionsConsolidated = {};
            const productPeriodSummary = {};

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
                if (sale.annulled) return; // Omitir ventas anuladas
                
                const saleTotal = sale.total ?? 0;
                const saleDiscount = sale.discountAmount ?? 0;
                const saleProfit = sale.totalProfit ?? 0;

                totalSales += saleTotal;
                totalDiscount += saleDiscount;
                totalGrossProfit += saleProfit;

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
                    case "credito":
                        totalCreditoIn += saleTotal;
                        break;
                    case "otro":
                        totalOtroIn += saleTotal;
                        break;
                    default:
                        console.warn(`Método de pago desconocido en venta ${sale.id}: ${sale.metodoPago}`);
                        break;
                }
                const employeeId = sale.vendedorId || "Desconocido";
                const employeeNameInSale = sale.vendedorNombre || "Desconocido";
                const employeeMetadata = usersMetadata.find(u => u.uid === employeeId);
                const isTeamAccount = employeeMetadata?.isTeamAccount || false;

                if (!salesByEmployee[employeeId]) {
                    salesByEmployee[employeeId] = {
                        name: employeeNameInSale,
                        uid: employeeId,
                        totalSales: 0,
                        cashSales: 0,
                        cardSales: 0,
                        transferenciaSales: 0,
                        creditoSales: 0,
                        otroSales: 0,
                        numSales: 0,
                        numHotdogsSold: 0,
                        generalCommissionEnabled: employeeMetadata?.generalCommissionEnabled || false,
                        generalCommissionAmount: employeeMetadata?.generalCommissionAmount ?? 0,
                        hotdogCommissionEnabled: employeeMetadata?.hotdogCommissionEnabled || false,
                        hotdogCommissionPerItem: employeeMetadata?.hotdogCommissionPerItem ?? 0,
                        totalGeneralCommissionEarned: 0,
                        totalHotdogCommissionEarned: 0,
                        shiftTeamMembers: sale.shiftTeamMembers || [],
                        shiftName: sale.shiftName || ''
                    };
                }
                salesByEmployee[employeeId].totalSales += saleTotal;
                salesByEmployee[employeeId].numSales++;

                if (employeeMetadata?.generalCommissionEnabled && employeeMetadata?.generalCommissionAmount > 0) {
                    salesByEmployee[employeeId].totalGeneralCommissionEarned += (employeeMetadata.generalCommissionAmount);
                }

                if (isTeamAccount) {
                    const teamMembersInSale = sale.shiftTeamMembers || [];
                    if (sale.totalHotdogCommission > 0 && teamMembersInSale.length > 0) {
                        const commissionPerTeamMember = sale.totalHotdogCommission / teamMembersInSale.length;
                        teamMembersInSale.forEach(memberName => {
                            const memberUser = usersMetadata.find(u => u.name === memberName || u.username === memberName);
                            if (memberUser) {
                                const individualEntry = getOrCreateIndividualCommissionEntry(memberUser.uid, memberUser.name || memberUser.username);
                                individualEntry.totalHotdogCommissionEarned += commissionPerTeamMember;
                            } else {
                                console.warn(`Miembro de equipo "${memberName}" no encontrado para dividir comisión.`);
                            }
                        });
                    }
                    if (salesByEmployee[employeeId].generalCommissionEnabled && salesByEmployee[employeeId].generalCommissionAmount > 0) {
                        const teamAccountEntry = getOrCreateIndividualCommissionEntry(employeeId, employeeNameInSale);
                        teamAccountEntry.totalGeneralCommissionEarned += salesByEmployee[employeeId].generalCommissionAmount;
                    }

                } else {
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
                    case "credito":
                        salesByEmployee[employeeId].creditoSales += saleTotal;
                        break;
                    case "otro":
                        salesByEmployee[employeeId].otroSales += saleTotal;
                        break;
                }
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach((item) => {
                        if (!item || !item.id) {
                            console.warn("Item de venta con ID faltante en reporte:", item);
                            return;
                        }
                        const itemId = item.id;
                        if (!productPeriodSummary[itemId]) {
                            productPeriodSummary[itemId] = {
                                id: itemId,
                                name: item.name || "Producto Desconocido",
                                quantitySold: 0,
                                totalRevenue: 0,
                                totalCost: 0,
                                totalProfit: 0
                            };
                        }
                        productPeriodSummary[itemId].quantitySold += item.quantity ?? 0;
                        productPeriodSummary[itemId].totalRevenue += (item.quantity ?? 0) * (item.price ?? 0);
                        productPeriodSummary[itemId].totalCost += (item.quantity ?? 0) * (item.costPriceAtTimeOfSale ?? 0);
                        productPeriodSummary[itemId].totalProfit += (item.profitPerItem ?? 0);

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
            Object.keys(individualCommissionsConsolidated).forEach(uid => {
                const individualEntry = individualCommissionsConsolidated[uid];
                const userMetadata = usersMetadata.find(u => u.uid === uid);
                individualEntry.name = userMetadata?.name || userMetadata?.username || individualEntry.name;
            });

            Object.keys(productPeriodSummary).forEach((productId) => {
                const productInCache = productsCache.find((p) => p.id === productId);
                productPeriodSummary[productId].currentStock = productInCache?.stock ?? "N/A";
                productPeriodSummary[productId].productCode = productInCache?.code || "N/A";
                productPeriodSummary[productId].productCategory = productInCache?.category || "N/A";
                productPeriodSummary[productId].sellingPrice = productInCache?.price ?? 0;
                productPeriodSummary[productId].costPrice = productInCache?.costPrice ?? 0;
                productPeriodSummary[productId].margin = (productPeriodSummary[productId].sellingPrice - productPeriodSummary[productId].costPrice) / productPeriodSummary[productId].sellingPrice;
            });

            const estimatedClosingCash = initialPettyCash + totalCashIn + totalCashAdditions - totalCashOut;

            currentReportData = {
                period: `${startDateInput} al ${endDateInput}`,
                initialPettyCash,
                totalSales,
                totalDiscount,
                totalCashIn,
                totalCardIn,
                totalTransferenciaIn,
                totalCreditoIn,
                totalOtroIn,
                totalCashAdditions,
                totalCashOut,
                totalGrossProfit,
                estimatedClosingCash,
                salesByEmployee,
                individualCommissionsConsolidated: Object.values(individualCommissionsConsolidated),
                productPeriodSummary: Object.values(productPeriodSummary),
                sales,
                cashAdditions,
                cashOutflows,
                inventoryMovements,
                usersMetadata
            };

            cuadreCajaUI.reportDetailsContainer.innerHTML = renderCashReport(currentReportData);
        } catch (error) {
            console.error("Error generando reporte de caja:", error);
            if (cuadreCajaUI.reportDetailsContainer)
                cuadreCajaUI.reportDetailsContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al generar reporte.</p>';
            if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos para generar el reporte.", "error");
            } else {
                showAlert("Error al generar el reporte de cuadre. Revisa la consola.", "error");
            }
            currentReportData = null;
        } finally {
            if (cuadreCajaUI.generateReportButton) {
                cuadreCajaUI.generateReportButton.disabled = false;
                cuadreCajaUI.generateReportButton.textContent = "Generar Reporte";
            }
            if (cuadreCajaUI.printReportButton) {
                if (currentReportData && currentUser && (currentUser.role === 'admin' || currentUser.isTeamAccount)) {
                    cuadreCajaUI.printReportButton.classList.remove("hidden");
                } else {
                    cuadreCajaUI.printReportButton.classList.add("hidden");
                }
            }
        }
    };
        const renderCashReport = (reportData) => {
        const {
            period,
            initialPettyCash = 0,
            totalSales = 0,
            totalDiscount = 0,
            totalCashIn = 0,
            totalCardIn = 0,
            totalTransferenciaIn = 0,
            totalCreditoIn = 0,
            totalOtroIn = 0,
            totalCashAdditions = 0,
            totalCashOut = 0,
            totalGrossProfit = 0,
            estimatedClosingCash = 0,
            salesByEmployee = {},
            individualCommissionsConsolidated = [],
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

        const totalTransactions = sales.length + cashAdditions.length + cashOutflows.length + inventoryMovements.length;
        if (totalTransactions > 0) {
            html += `
                    <div class="report-summary">
                        <h4>Resumen General</h4>
                        <p>Total Ventas (Neto): <strong>${formatPrice( totalSales )}</strong></p>
                        <p>Total Descuentos Aplicados: <strong style="color: var(--bg-success);">${formatPrice( totalDiscount )}</strong></p>
                        ${isAdmin ? `<p><strong>Ganancia Bruta General: <strong style="color: var(--bg-success);">${formatPrice(totalGrossProfit)}</strong></p>` : ''}
                        <p>Ingresos Efectivo por Ventas: <strong style="color: var(--bg-success);">${formatPrice( totalCashIn )}</strong></p>
                        <p>Ingresos Tarjeta por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalCardIn )}</strong></p>
                        <p>Ingresos Transferencia por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalTransferenciaIn )}</strong></p>
                        <p>Ingresos Crédito por Ventas: <strong style="color: var(--bg-info);">${formatPrice( totalCreditoIn )}</strong></p>
                        <p>Ingresos Otro Método por Ventas: <strong style="color: var(--bg-warning);">${formatPrice( totalOtroIn )}</strong></p>
                        <p><strong>Total Ingresos por Ventas (Sumado): ${formatPrice(
                          totalCashIn + totalCardIn + totalTransferenciaIn + totalCreditoIn + totalOtroIn
                        )}</strong></p>
                        <p>Total Adiciones a Caja: <strong style="color: var(--bg-success);">${formatPrice( totalCashAdditions )}</strong></p>
                        <p>Total Salidas de Caja: <strong style="color: var(--bg-danger);">${formatPrice( totalCashOut )}</strong></p>
                        <p><strong>Saldo Neto Estimado en Efectivo al Cierre: ${formatPrice( estimatedClosingCash )}</strong></p>
                    </div>
                `;

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
                        const generalCommissionInfo = data.generalCommissionEnabled ?
                            `Comisión General: ${formatPrice(data.generalCommissionAmount ?? 0)}/venta (${data.numSales} ventas = ${formatPrice(data.totalGeneralCommissionEarned ?? 0)})` :
                            `Sin Comisión General`;

                        const hotdogCommissionInfo = data.hotdogCommissionEnabled ?
                            `Comisión Hotdog (${formatPrice(data.hotdogCommissionPerItem ?? 0)}/hotdog): ${data.numHotdogsSold} hotdogs = ${formatPrice(data.totalHotdogCommissionEarned ?? 0)}` :
                            `Sin Comisión Hotdog`;

                        const displayId = data.uid && data.uid !== "Desconocido" ? data.uid.substring(0, 6) + "..." : "N/A";
                        html += `<li><strong>${data.name || "Desconocido"} <small>(ID: ${displayId})</small></strong>: ${formatPrice(data.totalSales ?? 0)} (${data.numSales} ventas)<br>`;
                        if (data.shiftTeamMembers && data.shiftTeamMembers.length > 0) {
                            html += `<small>Equipo: ${data.shiftTeamMembers.join(', ')}</small><br>`;
                            if (data.shiftName) {
                                html += `<small>Turno: ${data.shiftName}</small><br>`;
                            }
                        }
                        html += `<span class="commission-info">${generalCommissionInfo}</span><br>
                            <span class="commission-info">${hotdogCommissionInfo}</span><br>
                            Total de Venta por Método: (Ef: ${formatPrice(data.cashSales ?? 0)}, Tar: ${formatPrice(data.cardSales ?? 0)}, Trans: ${formatPrice(data.transferenciaSales ?? 0)}, Créd: ${formatPrice(data.creditoSales ?? 0)}, Otro: ${formatPrice(data.otroSales ?? 0)})
                        </li>`;
                    });
                } else {
                    html += `<li><p class="placeholder-text">No hay ventas registradas por vendedor.</p></li>`;
                }
                html += `</ul>`;
            }
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
                        const displayId = individual.uid && individual.uid !== "Desconocido" ? individual.uid.substring(0, 6) + "..." : "N/A";
                        const totalCommission = (individual.totalGeneralCommissionEarned ?? 0) + (individual.totalHotdogCommissionEarned ?? 0);

                        html += `
                            <li>
                                <strong>${individual.name || "Desconocido"} <small>(ID: ${displayId})</small></strong>:
                                <br>
                                <span class="commission-info">Comisión General: ${formatPrice(individual.totalGeneralCommissionEarned ?? 0)}</span>
                                <br>
                                <span class="commission-info">Comisión Hotdog: ${formatPrice(individual.totalHotdogCommissionEarned ?? 0)}</span>
                                <br>
                                <strong>TOTAL COMISIÓN: ${formatPrice(totalCommission)}</strong>
                            </li>
                        `;
                    });
                } else {
                    html += `<li><p class="placeholder-text">No se generaron comisiones individuales.</p></li>`;
                }
                html += `</ul>`;
            }
            html += `
                     <h4>Resumen de Productos Vendidos (${productPeriodSummary.length} productos)</h4>
                 `;
            if (productPeriodSummary.length > 0) {
                const sortedProductSummary = [...productPeriodSummary].sort((a, b) => a.name.localeCompare(b.name));

                html += `
                         <table>
                             <thead>
                                 <tr>
                                     <th data-label="Código">Código</th>
                                     <th data-label="Nombre">Nombre</th>
                                     <th data-label="Cant. Vendida">Cant. Vendida</th>
                                     <th data-label="Ingresos">Ingresos</th>
                                     ${isAdmin ? '<th data-label="Costo">Costo</th>' : ''}
                                     ${isAdmin ? '<th data-label="Ganancia">Ganancia</th>' : ''}
                                     <th data-label="Stock Actual">Stock Actual</th>
                                 </tr>
                             </thead>
                             <tbody>
                     `;
                sortedProductSummary.forEach((item) => {
                    const productInCache = productsCache.find(p => p.id === item.id);
                    const stockValue = productInCache?.stock ?? -1;
                    const stockClass = typeof stockValue === "number" ? (stockValue <= 0 ? "out-of-stock" : (stockValue <= (LOW_STOCK_THRESHOLD ?? 0) ? "low-stock" : "")) : "";
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
                html += '<p class="placeholder-text">No se vendieron productos en este rango de fechas.</p>';
            }

            html += `<h4>Detalle de Adiciones a Caja (${cashAdditions.length} adiciones)</h4>`;
            if (cashAdditions.length > 0) {
                const sortedAdditions = [...cashAdditions].sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
                html += `
                         <table>
                             <thead>
                                 <tr>
                                     <th data-label="ID Movimiento">ID Movimiento</th>
                                     <th data-label="Fecha/Hora">Fecha/Hora</th>
                                     ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''}
                                     <th data-label="Descripción">Descripción</th>
                                     <th data-label="Monto">Monto</th>
                                 </tr>
                             </thead>
                             <tbody>
                     `;
                sortedAdditions.forEach((addition) => {
                    const additionDate = addition.timestamp && typeof addition.timestamp.toDate === "function" ? addition.timestamp.toDate().toLocaleString("es-DO") : "N/A";
                    const recordedBy = usersMetadata.find((u) => u.uid === addition.recordedBy?.id);
                    const recordedByName = recordedBy?.username || recordedBy?.name || addition.recordedBy?.name || "Desconocido";

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
                html += '<p class="placeholder-text">No se encontraron adiciones a Caja.</p>';
            }

            html += `<h4>Detalle de Salidas de Caja (${cashOutflows.length} salidas)</h4>`;
            if (cashOutflows.length > 0) {
                const sortedOutflows = [...cashOutflows].sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
                html += `
                             <table>
                                 <thead>
                                     <tr>
                                         <th data-label="ID Movimiento">ID Movimiento</th>
                                         <th data-label="Fecha/Hora">Fecha/Hora</th>
                                         ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''}
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
                html += '<p class="placeholder-text">No se encontraron salidas de caja.</p>';
            }

            html += `<h4>Detalle de Movimientos de Inventario (${inventoryMovements.length} movimientos)</h4>`;
            if (inventoryMovements.length > 0) {
                const sortedInventoryMovements = [...inventoryMovements].sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
                html += `
                             <table>
                                 <thead>
                                     <tr>
                                         <th data-label="Fecha/Hora">Fecha/Hora</th>
                                         <th data-label="Producto">Producto</th>
                                         <th data-label="Tipo">Tipo</th>
                                         <th data-label="Cantidad">Cantidad</th>
                                         <th data-label="Descripción">Descripción</th>
                                         ${isAdmin ? '<th data-label="Registrado Por">Registrado Por</th>' : ''}
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
                    if (move.type === 'in') {
                        typeDisplay = 'Entrada';
                        quantityDisplay = `+${move.quantity ?? 0}`;
                    } else if (move.type === 'out_waste') {
                        typeDisplay = 'Merma/Daño';
                        quantityDisplay = `-${move.quantity ?? 0}`;
                    } else if (move.type === 'out_use') {
                        typeDisplay = 'Uso Interno';
                        quantityDisplay = `-${move.quantity ?? 0}`;
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
                html += '<p class="placeholder-text">No se encontraron movimientos de inventario.</p>';
            }

        } else {
            html += '<p class="placeholder-text">No se encontraron datos en este rango de fechas.</p>';
        }

        return html;
    };
        const handlePrintReport = () => {
        if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isTeamAccount)) {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!currentReportData) {
            showAlert('No hay datos de reporte para imprimir. Genera el reporte primero.', "warning");
            return;
        }

        console.log("Preparando reporte para impresión...");

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert('Permite ventanas emergentes para imprimir.', "warning");
            return;
        }

        const reportHtmlForPrint = renderCashReport(currentReportData);

        let printHtml = `
             <html>
             <head>
                  <title>Reporte de Cuadre de Caja - ${currentReportData.period}</title>
                  <style>
                       body { font-family: 'Roboto', sans-serif; font-size: 11px; line-height: 1.4; margin: 15mm; color: #000; }
                       h3, h4 { margin-top: 1em; margin-bottom: 0.5em; text-align: center; color: #000; }
                       h3 { font-size: 16px; }
                       h4 { font-size: 14px; text-align: left; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                       ul { list-style: none; padding: 0; }
                       li { margin-bottom: 0.3em; padding-bottom: 3px; border-bottom: 1px dashed #ddd; }
                       li:last-child { border-bottom: none; }
                       .report-summary, .individual-commission-summary { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; border-radius: 5px; page-break-inside: avoid; }
                       .report-summary p, .individual-commission-summary p { margin: 0.2em 0; }
                       table { width: 100%; border-collapse: collapse; margin-bottom: 1em; page-break-inside: avoid; }
                       th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; vertical-align: top; }
                       th { background-color: #eee; font-weight: bold; }
                       strong { font-weight: bold; }
                       .placeholder-text { font-style: italic; color: #888; text-align: center; }
                       .commission-info { font-size: 0.9em; color: #008000; display: block; }
                       .out-of-stock { color: red; }
                       .low-stock { color: orange; }
                       body, table, th, td { color: #000 !important; background-color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                       .print-logo-report { display: block; margin: 5mm auto; max-width: 40mm; height: auto; filter: grayscale(100%); -webkit-filter: grayscale(100%); }
                       td[data-label*="Monto"] strong, td[data-label*="Ingresos"] strong, td[data-label*="Ganancia"] strong { color: inherit !important; }
                       strong[style*="var(--bg-success)"], strong[style*="#008000"] { color: #008000 !important; }
                       strong[style*="var(--bg-danger)"], strong[style*="#ff0000"] { color: #FF0000 !important; }
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
                 <p style="text-align: center; font-size: 12px;">Saldo Inicial Caja Chica: <strong>${formatPrice(currentReportData.initialPettyCash)}</strong></p>
         `;
        printHtml += reportHtmlForPrint;

        printHtml += `
          <div class="report-footer">
              <p>Reporte generado por La Hotdoguería RD POS</p>
          </div>
          </body></html>`;

        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const generateAdminReport = async () => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }
        if (!db || !adminReportsUI.reportStartDate || !adminReportsUI.reportEndDate || !adminReportsUI.employeeSelect || !adminReportsUI.adminReportContainer || !adminReportsUI.generateAdminReportButton || !adminReportsUI.printAdminReportButton) {
            showAlert("Elementos de la interfaz no encontrados.", "error");
            console.error("Admin report UI elements not fully initialized.");
            return;
        }

        const startDateInput = adminReportsUI.reportStartDate.value;
        const endDateInput = adminReportsUI.reportEndDate.value;
        const selectedEmployeeId = adminReportsUI.employeeSelect.value;

        if (!startDateInput || !endDateInput) {
            showAlert("Por favor, selecciona un rango de fechas.", "warning");
            return;
        }
        if (startDateInput > endDateInput) {
            showAlert("La fecha de inicio no puede ser posterior a la fecha de fin.", "warning");
            return;
        }

        const {
            start: queryStartTimestamp,
            end: queryEndTimestamp
        } = getBusinessDateRange(startDateInput, endDateInput);

        adminReportsUI.adminReportContainer.innerHTML = '<p class="placeholder-text">Generando reporte de administrador...</p>';
        adminReportsUI.generateAdminReportButton.disabled = true;
        adminReportsUI.generateAdminReportButton.textContent = "Generando...";
        adminReportsUI.printAdminReportButton.classList.add("hidden");
        adminReportsUI.commissionDetailsContainer.classList.add('hidden');
        adminReportsUI.commissionDetailsContainer.innerHTML = '';


        try {
            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

            if (productsCache.length === 0) {
                const productsSnapshot = await db.collection("products").get();
                productsCache = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            let salesQuery = db.collection("sales")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc");

            if (selectedEmployeeId !== 'all') {
                salesQuery = salesQuery.where("vendedorId", "==", selectedEmployeeId);
            }
            const salesSnapshot = await salesQuery.get();
            const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let cashBalancesQuery = db.collection("cashBalances")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
                .orderBy("timestamp", "asc");

            if (selectedEmployeeId !== 'all') {
                cashBalancesQuery = cashBalancesQuery.where("userId", "==", selectedEmployeeId);
            }
            const cashBalances = (await cashBalancesQuery.get()).docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const allCreditAccountsSnapshot = await db.collection("creditAccounts").get();
            let allCreditAccounts = allCreditAccountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let relevantCreditAccounts = [];
            allCreditAccounts.forEach(account => {
                let transactionsInPeriod = (account.transactions || []).filter(t => {
                    const transactionDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                    return transactionDate >= queryStartTimestamp.toDate() && transactionDate <= queryEndTimestamp.toDate();
                });

                if (transactionsInPeriod.length > 0) {
                    const filteredAccount = { ...account, transactions: transactionsInPeriod };
                    relevantCreditAccounts.push(filteredAccount);
                }
            });

            if (selectedEmployeeId !== 'all') {
                relevantCreditAccounts = relevantCreditAccounts.filter(account => {
                    return account.customerId === selectedEmployeeId || (account.transactions || []).some(t => t.recordedBy?.id === selectedEmployeeId);
                });
            }
            let totalSales = 0,
                totalDiscount = 0,
                totalGrossProfit = 0,
                totalCashIn = 0,
                totalCardIn = 0,
                totalTransferenciaIn = 0,
                totalCreditoIn = 0,
                totalOtroIn = 0;

            const commissionsByIndividual = {};
            const salesByEmployee = {};
            const annulledSales = sales.filter(s => s.annulled);

            sales.forEach(sale => {
                if(sale.annulled) return;

                totalSales += sale.total || 0;
                totalDiscount += sale.discountAmount || 0;
                totalGrossProfit += sale.totalProfit || 0;

                switch (sale.metodoPago) {
                    case 'efectivo':
                        totalCashIn += sale.total || 0;
                        break;
                    case 'tarjeta':
                        totalCardIn += sale.total || 0;
                        break;
                    case 'transferencia':
                        totalTransferenciaIn += sale.total || 0;
                        break;
                    case 'credito':
                        totalCreditoIn += sale.total || 0;
                        break;
                    case 'otro':
                        totalOtroIn += sale.total || 0;
                        break;
                }

                const sellerId = sale.vendedorId;
                const sellerMetadata = usersMetadata.find(u => u.uid === sellerId);

                if (sellerMetadata) {
                    const sellerName = sellerMetadata.name || sellerMetadata.username;

                    if (!salesByEmployee[sellerId]) {
                        salesByEmployee[sellerId] = { name: sellerName, totalSales: 0, numSales: 0 };
                    }
                    salesByEmployee[sellerId].totalSales += sale.total || 0;
                    salesByEmployee[sellerId].numSales++;

                    if (!commissionsByIndividual[sellerId]) {
                        commissionsByIndividual[sellerId] = { name: sellerName, generalCommission: 0, hotdogCommission: 0 };
                    }

                    if (sellerMetadata.generalCommissionEnabled && sellerMetadata.generalCommissionAmount > 0) {
                        commissionsByIndividual[sellerId].generalCommission += sellerMetadata.generalCommissionAmount;
                    }
                    if (sale.totalHotdogCommission > 0) {
                        if (sellerMetadata.isTeamAccount && sale.shiftTeamMembers && sale.shiftTeamMembers.length > 0) {
                            const commissionPerTeamMember = sale.totalHotdogCommission / sale.shiftTeamMembers.length;
                            sale.shiftTeamMembers.forEach(memberName => {
                                const memberUser = usersMetadata.find(u => (u.name === memberName || u.username === memberName) && u.hotdogCommissionEnabled);
                                if (memberUser) {
                                    if (!commissionsByIndividual[memberUser.uid]) {
                                        commissionsByIndividual[memberUser.uid] = { name: memberUser.name || memberUser.username, generalCommission: 0, hotdogCommission: 0 };
                                    }
                                    commissionsByIndividual[memberUser.uid].hotdogCommission += commissionPerTeamMember;
                                }
                            });
                        } else if (!sellerMetadata.isTeamAccount && sellerMetadata.hotdogCommissionEnabled) {
                            commissionsByIndividual[sellerId].hotdogCommission += sale.totalHotdogCommission;
                        }
                    }
                }
            });

            const finalCommissions = Object.values(commissionsByIndividual).map(c => ({
                ...c,
                total: c.generalCommission + c.hotdogCommission
            })).sort((a, b) => b.total - a.total);

            const finalSalesByEmployee = Object.values(salesByEmployee).sort((a, b) => b.totalSales - a.totalSales);

            const topCommissionEarner = finalCommissions[0] || null;
            const topSeller = finalSalesByEmployee[0] || null;

            currentReportData = {
                period: `${startDateInput} al ${endDateInput}`,
                employeeFilter: selectedEmployeeId === 'all' ? 'Todos' : usersMetadata.find(u => u.uid === selectedEmployeeId)?.name || 'Desconocido',
                financialSummary: {
                    totalSales,
                    totalDiscount,
                    totalGrossProfit,
                    totalCashIn,
                    totalCardIn,
                    totalTransferenciaIn,
                    totalCreditoIn,
                    totalOtroIn,
                    totalAnnulledSales: annulledSales.reduce((acc, sale) => acc + (sale.total || 0), 0),
                    countAnnulledSales: annulledSales.length
                },
                commissions: finalCommissions,
                salesByEmployee: finalSalesByEmployee,
                topCommissionEarner: topCommissionEarner,
                topSeller: topSeller,
                cashBalances: cashBalances,
                creditAccounts: relevantCreditAccounts,
                salesDetails: sales, // Incluye las anuladas para el detalle
            };

            adminReportsUI.adminReportContainer.innerHTML = renderAdminReport(currentReportData);

            setupAccordion(adminReportsUI.summaryHeader, adminReportsUI.summaryContent);
            setupAccordion(adminReportsUI.commissionsHeader, adminReportsUI.commissionsContent);
            setupAccordion(adminReportsUI.cashBalancesHeader, adminReportsUI.cashBalancesContent);
            setupAccordion(adminReportsUI.accountsReceivableHeader, adminReportsUI.accountsReceivableContent);
            setupAccordion(adminReportsUI.salesDetailsHeader, adminReportsUI.salesDetailsContent);

            renderSalesTrendChart(sales);
            renderCommissionStackedBarChart(finalCommissions);
            renderAccountsReceivableChart(relevantCreditAccounts);


        } catch (error) {
            console.error("Error generando reporte de administrador:", error);
            if (error.code === "permission-denied" || error.message.includes('insufficient permissions')) {
                showAlert("Error de permisos. Revisa tus Security Rules.", "error");
            } else {
                showAlert("Error al generar el reporte de administrador.", "error");
            }
            adminReportsUI.adminReportContainer.innerHTML = '<p class="placeholder-text" style="color:red;">Error al generar el reporte.</p>';
            currentReportData = null;
        } finally {
            adminReportsUI.generateAdminReportButton.disabled = false;
            adminReportsUI.generateAdminReportButton.textContent = "Generar Reporte General";
            if (currentReportData) {
                adminReportsUI.printAdminReportButton.classList.remove("hidden");
            }
        }
    };
        const renderAdminReport = (reportData) => {
        const {
            period,
            employeeFilter,
            financialSummary,
            commissions,
            cashBalances,
            creditAccounts,
            salesDetails,
            salesByEmployee,
            topSeller,
            topCommissionEarner
        } = reportData;

        adminReportsUI.adminReportContainer.innerHTML = '';
        const title = document.createElement('h3');
        title.textContent = `Reporte de Administrador (${period}) - Filtro: ${employeeFilter}`;
        adminReportsUI.adminReportContainer.appendChild(title);

        adminReportsUI.summaryContent.innerHTML = `
            <div class="summary-grid">
                <div><span>Ventas Totales (Neto):</span> <strong>${formatPrice(financialSummary.totalSales)}</strong></div>
                <div><span>Ganancia Bruta:</span> <strong>${formatPrice(financialSummary.totalGrossProfit)}</strong></div>
                <div><span>Total Descuentos:</span> ${formatPrice(financialSummary.totalDiscount)}</div>
                <div><span>Ingresos por Efectivo:</span> ${formatPrice(financialSummary.totalCashIn)}</div>
                <div><span>Ingresos por Tarjeta:</span> ${formatPrice(financialSummary.totalCardIn)}</div>
                <div><span>Ingresos por Transferencia:</span> ${formatPrice(financialSummary.totalTransferenciaIn)}</div>
                <div style="color: var(--bg-danger);"><span>Ventas Anuladas:</span> <strong>${formatPrice(financialSummary.totalAnnulledSales)} (${financialSummary.countAnnulledSales})</strong></div>
            </div>
            <h4>Indicadores de Rendimiento</h4>
            <div class="summary-grid">
                 <div><span>Usuario con Mayores Ventas:</span> <strong>${topSeller ? `${topSeller.name} (${formatPrice(topSeller.totalSales)})` : 'N/A'}</strong></div>
                 <div><span>Usuario con Mayor Comisión:</span> <strong>${topCommissionEarner ? `${topCommissionEarner.name} (${formatPrice(topCommissionEarner.total)})` : 'N/A'}</strong></div>
            </div>`;

        adminReportsUI.commissionsContent.innerHTML = commissions.length > 0 ? `
            <table>
                <thead><tr><th>Empleado</th><th>Comisión General</th><th>Comisión Hotdog</th><th>Total</th></tr></thead>
                <tbody>
                    ${commissions.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td class="numeric">${formatPrice(c.generalCommission)}</td>
                            <td class="numeric">${formatPrice(c.hotdogCommission)}</td>
                            <td class="numeric"><strong>${formatPrice(c.total)}</strong></td>
                        </tr>`).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay comisiones para este filtro.</p>';


        adminReportsUI.cashBalancesContent.innerHTML = cashBalances.length > 0 ? `
            <table>
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Esperado</th><th>Real</th><th>Diferencia</th></tr></thead>
                <tbody>
                    ${cashBalances.map(cb => `
                        <tr class="${cb.difference !== 0 ? 'warning-row' : ''}">
                            <td>${cb.timestamp?.toDate ? cb.timestamp.toDate().toLocaleString('es-DO') : 'N/A'}</td>
                            <td>${cb.userName || 'N/A'}</td>
                            <td class="numeric">${formatPrice(cb.expectedCash)}</td>
                            <td class="numeric">${formatPrice(cb.realCash)}</td>
                            <td class="numeric ${cb.difference < 0 ? 'out-of-stock' : cb.difference > 0 ? 'low-stock' : ''}"><strong>${formatPrice(cb.difference)}</strong></td>
                        </tr>`).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay cuadres de caja para este filtro.</p>';

        adminReportsUI.accountsReceivableContent.innerHTML = creditAccounts.length > 0 ? `
            <table>
                <thead><tr><th>Cliente</th><th>Total Deuda</th><th>Saldo Pendiente</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${creditAccounts.map(ca => `
                        <tr class="${ca.balance > 0 ? 'warning-row' : ''}">
                            <td>${ca.customerName || 'N/A'}</td>
                            <td class="numeric">${formatPrice(ca.totalDue)}</td>
                            <td class="numeric"><strong>${formatPrice(ca.balance)}</strong></td>
                            <td>${ca.status || 'N/A'}</td>
                             <td class="table-actions">
                                <button class="button-primary small record-payment-button" data-customer-id="${ca.id}" ${ca.balance <= 0 ? 'disabled' : ''}>Registrar Pago</button>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay cuentas por cobrar activas para este filtro.</p>';

        adminReportsUI.accountsReceivableContent.querySelectorAll('.record-payment-button').forEach(button => {
            button.addEventListener('click', () => {
                const customerId = button.dataset.customerId;
                const customerData = creditAccounts.find(c => c.id === customerId);
                if (customerData) {
                    handleRecordPayment(customerData);
                }
            });
        });

        adminReportsUI.salesDetailsContent.innerHTML = salesDetails.length > 0 ? `
            <table>
                <thead><tr><th>ID</th><th>Fecha</th><th>Vendedor</th><th>Cliente</th><th>Total</th><th>Ganancia</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                    ${salesDetails.sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map(s => `
                        <tr class="${s.annulled ? 'annulled-row' : ''}">
                            <td>${s.id.substring(0, 8)}...</td>
                            <td>${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString('es-DO') : 'N/A'}</td>
                            <td>${s.vendedorNombre || 'N/A'}</td>
                            <td>${s.customerName || '-'}</td>
                            <td class="numeric">${formatPrice(s.total)}</td>
                            <td class="numeric">${formatPrice(s.totalProfit)}</td>
                            <td>${s.annulled ? 'Anulada' : 'OK'}</td>
                            <td class="table-actions">
                                <button class="button-secondary small view-invoice-button" data-invoice-id="${s.id}">Ver Factura</button>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay ventas para este filtro.</p>';

        adminReportsUI.salesDetailsContent.querySelectorAll('.view-invoice-button').forEach(button => {
            button.addEventListener('click', async () => {
                const invoiceId = button.dataset.invoiceId;
                const saleData = salesDetails.find(s => s.id === invoiceId);
                if (saleData) {
                    const invoiceHtml = generateInvoiceHTML(saleData, true, true);
                    showModal(modals.invoicePreview, `<pre>${invoiceHtml}</pre>`, invoiceId);
                }
            });
        });

        return adminReportsUI.adminReportContainer.innerHTML;
    };
        const generateCommissionDetails = async () => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert("Acceso restringido.", "warning");
            return;
        }

        const startDateInput = adminReportsUI.reportStartDate.value;
        const endDateInput = adminReportsUI.reportEndDate.value;
        const selectedEmployeeId = adminReportsUI.employeeSelect.value;
        const container = adminReportsUI.commissionDetailsContainer;

        if (!startDateInput || !endDateInput) {
            showAlert("Primero selecciona un rango de fechas.", "warning");
            return;
        }

        container.innerHTML = '<p class="placeholder-text">Buscando comisiones detalladas...</p>';
        container.classList.remove('hidden');

        adminReportsUI.generateCommissionDetailsButton.disabled = true;

        try {
            const { start: queryStartTimestamp, end: queryEndTimestamp } = getBusinessDateRange(startDateInput, endDateInput);

            let salesQuery = db.collection("sales")
                .where("timestamp", ">=", queryStartTimestamp)
                .where("timestamp", "<=", queryEndTimestamp)
               .where("annulled", "==", false)

            const salesSnapshot = await salesQuery.get();
            const allSales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const usersSnapshot = await db.collection("users").get();
            const usersMetadata = usersSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = { uid: doc.id, ...doc.data() };
                return acc;
            }, {});

            let detailedCommissions = [];

            allSales.forEach(sale => {
                const sellerMeta = usersMetadata[sale.vendedorId];
                if (!sellerMeta) return;

                if (sellerMeta.generalCommissionEnabled && sellerMeta.generalCommissionAmount > 0) {
                    detailedCommissions.push({
                        employeeId: sellerMeta.uid,
                        employeeName: sellerMeta.name || sellerMeta.username,
                        saleId: sale.id,
                        commissionType: 'General',
                        amount: sellerMeta.generalCommissionAmount,
                        date: sale.timestamp.toDate()
                    });
                }

                if (sale.totalHotdogCommission > 0) {
                    if (sellerMeta.isTeamAccount && sale.shiftTeamMembers && sale.shiftTeamMembers.length > 0) {
                        const commissionPerMember = sale.totalHotdogCommission / sale.shiftTeamMembers.length;
                        sale.shiftTeamMembers.forEach(memberName => {
                            const memberUser = Object.values(usersMetadata).find(u => u.name === memberName || u.username === memberName);
                            if (memberUser) {
                                detailedCommissions.push({
                                    employeeId: memberUser.uid,
                                    employeeName: memberUser.name || memberUser.username,
                                    saleId: sale.id,
                                    commissionType: 'Hotdog (Equipo)',
                                    amount: commissionPerMember,
                                    date: sale.timestamp.toDate()
                                });
                            }
                        });
                    } else if (!sellerMeta.isTeamAccount && sellerMeta.hotdogCommissionEnabled) {
                        detailedCommissions.push({
                            employeeId: sellerMeta.uid,
                            employeeName: sellerMeta.name || sellerMeta.username,
                            saleId: sale.id,
                            commissionType: 'Hotdog (Individual)',
                            amount: sale.totalHotdogCommission,
                            date: sale.timestamp.toDate()
                        });
                    }
                }
            });

            if (selectedEmployeeId !== 'all') {
                detailedCommissions = detailedCommissions.filter(c => c.employeeId === selectedEmployeeId);
            }

            renderCommissionDetailsTable(detailedCommissions, container);

        } catch (error) {
            console.error("Error generando detalles de comisiones:", error);
            if(error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
               container.innerHTML = '<p class="placeholder-text" style="color:red;">Error de permisos al generar reporte.</p>';
            } else {
               container.innerHTML = '<p class="placeholder-text" style="color:red;">Error al generar reporte detallado.</p>';
            }
        } finally {
            adminReportsUI.generateCommissionDetailsButton.disabled = false;
        }
    };

    const renderCommissionDetailsTable = (commissions, container) => {
        let contentHtml = '<h4>Reporte Detallado de Comisiones</h4>';

        if (commissions.length === 0) {
            contentHtml += '<p class="placeholder-text">No se encontraron comisiones para el filtro seleccionado.</p>';
            container.innerHTML = contentHtml;
            return;
        }

        commissions.sort((a, b) => b.date - a.date);

        contentHtml += `
            <div class="report-actions" style="text-align: right; margin-bottom: 15px;">
                <button id="download-commissions-pdf-button" class="button-primary"><i class="fas fa-file-pdf"></i> Descargar PDF</button>
            </div>
        `;

        contentHtml += `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Empleado</th>
                        <th>ID de Venta</th>
                        <th>Tipo Comisión</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
        `;
        let totalCommission = 0;
        commissions.forEach(c => {
            totalCommission += c.amount;
            contentHtml += `
                <tr>
                    <td>${c.date.toLocaleDateString('es-DO')}</td>
                    <td>${c.employeeName}</td>
                    <td>${c.saleId.substring(0, 8)}...</td>
                    <td>${c.commissionType}</td>
                    <td><strong>${formatPrice(c.amount)}</strong></td>
                </tr>
            `;
        });

        contentHtml += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align:right; font-weight:bold;">Total Comisiones:</td>
                        <td style="font-weight:bold;">${formatPrice(totalCommission)}</td>
                    </tr>
                </tfoot>
            </table>
        `;

        container.innerHTML = contentHtml;
        const downloadButton = container.querySelector('#download-commissions-pdf-button');
        if (downloadButton) {
            downloadButton.addEventListener('click', downloadCommissionDetailsPDF);
        }
    };
        const handlePrintAdminReport = () => {
        if (!currentUser || currentUser.role !== "admin") {
            showAlert('Acceso restringido.', "warning");
            return;
        }
        if (!currentReportData) {
            showAlert('No hay datos de reporte para imprimir.', "warning");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert('Permite ventanas emergentes para imprimir.', "warning");
            return;
        }

        const {
            period,
            employeeFilter,
            financialSummary,
            commissions,
            cashBalances,
            creditAccounts,
            salesDetails,
            salesByEmployee,
            topSeller,
            topCommissionEarner
        } = currentReportData;

        const financialSummaryHtml = `
            <div class="summary-grid">
                <div><span>Ventas Totales (Neto):</span> <strong>${formatPrice(financialSummary.totalSales)}</strong></div>
                <div><span>Ganancia Bruta:</span> <strong>${formatPrice(financialSummary.totalGrossProfit)}</strong></div>
                <div><span>Total Descuentos:</span> ${formatPrice(financialSummary.totalDiscount)}</div>
                <div><span>Ingresos Efectivo:</span> ${formatPrice(financialSummary.totalCashIn)}</div>
                 <div><span>Ingresos Tarjeta:</span> ${formatPrice(financialSummary.totalCardIn)}</div>
                <div><span>Ingresos Transferencia:</span> ${formatPrice(financialSummary.totalTransferenciaIn)}</div>
                <div><span>Ventas Anuladas:</span> <strong>${formatPrice(financialSummary.totalAnnulledSales)} (${financialSummary.countAnnulledSales})</strong></div>
            </div>
        `;

        const perfIndicatorsHtml = `
            <div class="summary-grid">
                <div><span>Usuario con Mayores Ventas:</span> <strong>${topSeller ? `${topSeller.name} (${formatPrice(topSeller.totalSales)})` : 'N/A'}</strong></div>
                <div><span>Usuario con Mayor Comisión:</span> <strong>${topCommissionEarner ? `${topCommissionEarner.name} (${formatPrice(topCommissionEarner.total)})` : 'N/A'}</strong></div>
            </div>
        `;

        const salesByEmployeeHtml = salesByEmployee.length > 0 ? `
            <table>
                <thead>
                    <tr><th>Empleado</th><th>Ventas Totales</th><th># Ventas</th></tr>
                </thead>
                <tbody>
                    ${salesByEmployee.map(e => `
                        <tr><td>${e.name}</td><td class="numeric">${formatPrice(e.totalSales)}</td><td class="numeric">${e.numSales}</td></tr>
                    `).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay ventas.</p>';

        const commissionsHtml = commissions.length > 0 ? `
            <table>
                <thead>
                    <tr><th>Empleado</th><th>Comisión General</th><th>Comisión Hotdog</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${commissions.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td class="numeric">${formatPrice(c.generalCommission)}</td>
                            <td class="numeric">${formatPrice(c.hotdogCommission)}</td>
                            <td class="numeric"><strong>${formatPrice(c.total)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay comisiones.</p>';
        const cashBalancesHtml = cashBalances.length > 0 ? `
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Usuario</th><th>Esperado</th><th>Real</th><th>Diferencia</th></tr>
                </thead>
                <tbody>
                    ${cashBalances.map(cb => `
                        <tr>
                            <td>${cb.timestamp?.toDate ? cb.timestamp.toDate().toLocaleString('es-DO') : 'N/A'}</td>
                            <td>${cb.userName || 'N/A'}</td>
                            <td class="numeric">${formatPrice(cb.expectedCash)}</td>
                            <td class="numeric">${formatPrice(cb.realCash)}</td>
                            <td class="numeric"><strong>${formatPrice(cb.difference)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay cuadres.</p>';

        const aReceivableHtml = creditAccounts.length > 0 ? `
            <table>
                <thead>
                    <tr><th>Cliente</th><th>Total Deuda</th><th>Saldo Pendiente</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    ${creditAccounts.map(ca => `
                        <tr>
                            <td>${ca.customerName || 'N/A'}</td>
                            <td class="numeric">${formatPrice(ca.totalDue)}</td>
                            <td class="numeric"><strong>${formatPrice(ca.balance)}</strong></td>
                            <td>${ca.status || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay cuentas por cobrar.</p>';

        const detailedSalesHtml = salesDetails.length > 0 ? `
            <table>
                <thead>
                    <tr><th>ID</th><th>Fecha</th><th>Vendedor</th><th>Total</th><th>Ganancia</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    ${salesDetails.sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map(s => `
                        <tr>
                            <td>${s.id.substring(0,8)}...</td>
                            <td>${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString('es-DO') : 'N/A'}</td>
                            <td>${s.vendedorNombre || 'N/A'}</td>
                            <td class="numeric">${formatPrice(s.total)}</td>
                            <td class="numeric">${formatPrice(s.totalProfit)}</td>
                            <td>${s.annulled ? 'Anulada' : 'OK'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : '<p class="placeholder-text">No hay ventas detalladas.</p>';


        let printHtml = `
            <html>
            <head>
                <title>Reporte Administrador - ${period}</title>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10pt; line-height: 1.3; margin: 15mm; color: #333; }
                    .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .print-logo-report { display: block; margin: 0 auto 10px auto; max-width: 120px; }
                    .report-header h2 { margin: 0; font-size: 18pt; }
                    .report-header p { margin: 2px 0; font-size: 9pt; color: #555; }
                    .report-section { margin-top: 20px; page-break-inside: avoid; }
                    .report-section h3 { font-size: 12pt; text-align: left; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9pt; }
                    th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
                    th { background-color: #f0f0f0; }
                    strong, th { font-weight: bold; }
                    td.numeric { text-align: right; }
                    .placeholder-text { font-style: italic; color: #999; text-align: center; padding: 15px; }
                    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 15px; padding: 10px; border: 1px solid #eee; background: #fafafa; margin-bottom: 10px;}
                    .summary-grid div span { font-weight: bold; }
                    .report-footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8pt; color: #777; }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <img src="${BUSINESS_LOGO_URL}" class="print-logo-report" alt="Logo">
                    <h2>Reporte de Administrador</h2>
                    <p><strong>Período:</strong> ${period}</p>
                    <p><strong>Filtro:</strong> ${employeeFilter}</p>
                    <p><strong>Generado:</strong> ${new Date().toLocaleString('es-DO')}</p>
                </div>

                <div class="report-section">
                    <h3>Resumen Financiero</h3>
                    ${financialSummaryHtml}
                </div>
                
                <div class="report-section">
                    <h3>Indicadores de Rendimiento</h3>
                    ${perfIndicatorsHtml}
                </div>

                <div class="report-section">
                    <h3>Ventas por Empleado</h3>
                    ${salesByEmployeeHtml}
                </div>

                <div class="report-section">
                    <h3>Comisiones Generadas</h3>
                    ${commissionsHtml}
                </div>
                
                <div class="report-section">
                    <h3>Cuadres de Caja</h3>
                    ${cashBalancesHtml}
                </div>
                
                <div class="report-section">
                    <h3>Cuentas por Cobrar</h3>
                    ${aReceivableHtml}
                </div>

                <div class="report-section">
                    <h3>Detalle de Ventas</h3>
                    ${detailedSalesHtml}
                </div>

                <div class="report-footer">
                    La Hotdoguería RD POS
                </div>
            </body>
            </html>`;

        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
        /**
     * Genera un PDF a partir del contenido del reporte de comisiones detalladas y lo descarga.
     */
    const downloadCommissionDetailsPDF = async () => {
        const container = adminReportsUI.commissionDetailsContainer;
        if (!container || container.classList.contains('hidden')) {
            showToast("No hay reporte de comisiones visible para descargar.", "error");
            return;
        }

        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            showToast("Las librerías para PDF no están cargadas.", "error");
            return;
        }

        showToast("Generando PDF de comisiones...", "info");

        try {
            const downloadButton = container.querySelector('#download-commissions-pdf-button');
            if (downloadButton) downloadButton.style.display = 'none';

            const canvas = await html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });

            if (downloadButton) downloadButton.style.display = 'inline-block';

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight > (pdf.internal.pageSize.getHeight() - 20) ? pdf.internal.pageSize.getHeight() - 20 : pdfHeight);

            const startDate = adminReportsUI.reportStartDate.value;
            const endDate = adminReportsUI.reportEndDate.value;
            const fileName = `Reporte-Comisiones-Detallado-${startDate}-a-${endDate}.pdf`;

            pdf.save(fileName);
            showToast("Descarga de PDF de comisiones iniciada.", "success");

        } catch (error) {
            console.error("Error generando el PDF de comisiones:", error);
            showToast("Error al generar el PDF. Revisa la consola.", "error");
            const downloadButton = container.querySelector('#download-commissions-pdf-button');
            if (downloadButton) downloadButton.style.display = 'inline-block';
        }
    };
    // --- DOM modals Selectors ---
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
        confirmNewPasswordInput: document.getElementById("confirm-new-password-input"),
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
        setTeamMembersButton: document.getElementById('set-team-members-button'),
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
        salesSectionPlaceholder: document.getElementById('sales-section-placeholder')
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

    // ===================================
    //  AÑADE ESTE NUEVO OBJETO
    // ===================================
    const cuentasUI = {
        section: document.getElementById('cuentas-section'),
        searchInput: document.getElementById('cuentas-search-input'),
        listContainer: document.getElementById('cuentas-list-container'),
    };
    // ===================================


    const cuadreCajaUI = {
        section: document.getElementById("cuadrecaja-section"),
        openCashBtn: document.getElementById('openCashBtn'),
        adminOpenCashBtn: document.getElementById('adminOpenCashBtn'), // Nuevo botón para admin
        cashBalanceBtn: document.getElementById('cashBalanceBtn'),
        closeCashBtn: document.getElementById('closeCashBtn'),
        cashChangeInput: document.getElementById('cashChangeInput'),
        initialCashInput: document.getElementById('initialCashInput'),
        cashEntriesTotal: document.getElementById('cashEntriesTotal'),
        cashSalesAmount: document.getElementById('cashSalesAmount'),
        totalEntries: document.getElementById('totalEntries'),
        supplierPayments: document.getElementById('supplierPayments'),
        currentCashTotal: document.getElementById('currentCashTotal'),
        cashPayments: document.getElementById('cashPayments'),
        cardPayments: document.getElementById('cardPayments'),
        totalPayments: document.getElementById('totalPayments'),
        totalDepartmentSales: document.getElementById('totalDepartmentSales'),
        currentEstimatedCashInHandDisplay: document.getElementById('currentEstimatedCashInHandDisplay'),
        salesByCategoryChartCanvas: document.getElementById('salesByCategoryChart'),
        paymentMethodsChartCanvas: document.getElementById('paymentMethodsChart'),
        departmentSalesChartContainer: document.getElementById('departmentSalesChartContainer'),
        paymentMethodsChartContainer: document.getElementById('paymentMethodsChartContainer'),
        reportStartDate: document.getElementById("report-start-date"),
        reportEndDate: document.getElementById("report-end-date"),
        initialPettyCashInput: document.getElementById("initial-petty-cash-input"),
        generateReportButton: document.getElementById("generate-report-button"),
        searchInvoiceInput: document.getElementById("search-invoice-input"),
        searchInvoiceButton: document.getElementById("search-invoice-button"),
        printReportButton: document.getElementById("print-report-button"),
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

    const adminReportsUI = {
        section: document.getElementById("admin-reports-section"),
        reportStartDate: document.getElementById("admin-report-start-date"),
        reportEndDate: document.getElementById("admin-report-end-date"),
        employeeSelect: document.getElementById("admin-report-employee-select"),
        generateAdminReportButton: document.getElementById("generate-admin-report-button"),
        generateCommissionDetailsButton: document.getElementById("generate-commission-details-button"),
        adminReportContainer: document.getElementById("admin-report-details-container"),
        commissionDetailsContainer: document.getElementById("commission-details-container"),
        printAdminReportButton: document.getElementById("print-admin-report-button"),
        summaryHeader: document.getElementById('summary-section-header'),
        summaryContent: document.getElementById('summary-section-content'),
        commissionsHeader: document.getElementById('commissions-section-header'),
        commissionsContent: document.getElementById('commissions-section-content'),
        cashBalancesHeader: document.getElementById('cash-balances-section-header'),
        cashBalancesContent: document.getElementById('cash-balances-section-content'),
        accountsReceivableHeader: document.getElementById('accounts-receivable-section-header'),
        accountsReceivableContent: document.getElementById('accounts-receivable-section-content'),
        salesDetailsHeader: document.getElementById('sales-details-section-header'),
        salesDetailsContent: document.getElementById('sales-details-section-content'),
        salesTrendChartCanvas: document.getElementById('salesTrendChart'),
        commissionStackedBarChartCanvas: document.getElementById('commissionStackedBarChart')
    };
    const modals = {
        adminCode: {
            element: document.getElementById("admin-code-modal"),
            message: document.getElementById("admin-code-modal-message"),
            input: document.getElementById("modal-admin-code-input"),
            verifyButton: document.getElementById("modal-verify-admin-code-button"),
            isSticky: true
        },
        adminOpenCashbox: { // Nuevo modal para admin
            element: document.getElementById("admin-open-cashbox-modal"),
            title: document.getElementById("admin-open-cashbox-title"),
            userSelect: document.getElementById("admin-cashbox-user-select"),
            initialCashInput: document.getElementById("admin-cashbox-initial-cash"),
            cashChangeInput: document.getElementById("admin-cashbox-cash-change"),
            confirmButton: document.getElementById("admin-confirm-open-cashbox-button"),
            isSticky: true
        },
        // =======================================================
    //          ===>    PEGA EL CÓDIGO AQUÍ    <===
    // =======================================================
    adminManageCashbox: {
        element: document.getElementById('admin-manage-cashbox-modal'),
        title: document.getElementById('admin-manage-cashbox-title'),
        status: document.getElementById('admin-cashbox-status'),
        forceOpenBtn: document.getElementById('admin-force-open-cashbox-btn'),
        addCashBtn: document.getElementById('admin-add-cash-btn'),
        removeCashBtn: document.getElementById('admin-remove-cash-btn'),
        forceCloseBtn: document.getElementById('admin-force-close-cashbox-btn'),
    },
    // =======================================================
    
        product: {
            element: document.getElementById("product-modal"),
            title: document.getElementById("product-modal-title"),
            nameInput: document.getElementById("product-name-input"),
            codeInput: document.getElementById("product-code-input"),
            categoryInput: document.getElementById('product-category-input'),
            boxPriceInput: document.getElementById("product-box-price-input"),
            boxUnitsInput: document.getElementById("product-box-units-input"),
            priceInput: document.getElementById("product-price-input"),
            costInput: document.getElementById("product-cost-input"),
            stockInput: document.getElementById("product-stock-input"),
            saveButton: document.getElementById("save-product-button"),
            isSticky: true
        },
        user: {
            element: document.getElementById("user-modal"),
            title: document.getElementById("user-modal-title"),
            nameInput: document.getElementById("user-name-input"),
            usernameInput: document.getElementById("user-username-input"),
            emailInput: document.getElementById('user-email-input'),
            idInput: document.getElementById("user-id-input"),
            passwordInput: document.getElementById("user-password-input"),
            roleSelect: document.getElementById("user-role-select"),
            generalCommissionEnabledCheckbox: document.getElementById("user-general-commission-enabled-checkbox"),
            generalCommissionAmountInput: document.getElementById("user-general-commission-amount-input"),
            generalCommissionAmountGroup: document.getElementById("user-general-commission-amount-group"),
            hotdogCommissionEnabledCheckbox: document.getElementById("user-hotdog-commission-enabled-checkbox"),
            hotdogCommissionPerItemInput: document.getElementById("user-hotdog-commission-per-item-input"),
            hotdogCommissionAmountGroup: document.getElementById("user-hotdog-commission-amount-group"),
            isTeamAccountCheckbox: document.getElementById('user-is-team-account-checkbox'),
            saveButton: document.getElementById("save-user-button"),
            isSticky: true
        },
        editCartItem: {
            element: document.getElementById("edit-cart-item-modal"),
            nameDisplay: document.getElementById("edit-cart-item-name"),
            quantityInput: document.getElementById("edit-cart-item-quantity"),
            priceInput: document.getElementById("edit-cart-item-price"),
            stockInfo: document.getElementById("edit-cart-item-stock-info"),
            saveButton: document.getElementById("save-edited-cart-item-button"),
            isSticky: true
        },
        confirmAction: {
            element: document.getElementById("confirm-action-modal"),
            title: document.getElementById("confirm-modal-title"),
            message: document.getElementById("confirm-modal-message"),
            yesButton: document.getElementById("confirm-yes-button"),
            noButton: document.getElementById("confirm-no-button"),
            isSticky: true
        },
        invoicePreview: {
            element: document.getElementById("invoice-preview-modal"),
            content: document.getElementById("invoice-content"),
            printButton: document.getElementById("print-invoice-button"),
            downloadButton: document.getElementById("modal-download-pdf-button"),
            deleteButton: document.getElementById("delete-invoice-button"),
            modifyButton: document.getElementById("modify-invoice-button"),
            closeButton: document.getElementById("close-invoice-modal-button"),
            isSticky: false
        },
        inventoryMovement: {
            element: document.getElementById("inventory-movement-modal"),
            productSelect: document.getElementById("modal-inv-move-product-select"),
            typeSelect: document.getElementById("modal-inv-move-type-select"),
            quantityInput: document.getElementById("modal-inv-move-quantity-input"),
            descriptionInput: document.getElementById("modal-inv-move-description-input"),
            saveButton: document.getElementById("modal-record-inventory-movement-button"),
            isSticky: true
        },
        setTeamMembers: {
            element: document.getElementById('set-team-members-modal'),
            shiftNameInput: document.getElementById('shift-name-input'),
            teamMembersList: document.getElementById('team-members-selection-list'),
            printButton: document.getElementById('print-shift-report-button'),
            saveButton: document.getElementById('save-team-members-button'),
            isSticky: true
        },
        cashBalanceDisplay: {
            element: document.getElementById("cash-balance-display-modal"),
            title: document.getElementById("cash-balance-modal-title"),
            content: document.getElementById("cash-balance-modal-content"),
            confirmButton: document.getElementById("cash-balance-confirm-real-cash"),
            isSticky: true
        },
        creditAccount: {
            element: document.getElementById("credit-account-modal"),
            title: document.getElementById("credit-account-modal-title"),
            customerSearchInput: document.getElementById("credit-customer-search"),
            customerResultsList: document.getElementById("credit-customer-results"),
            customerDetailsContainer: document.getElementById("credit-customer-details"),
            customerNameInput: document.getElementById("credit-customer-name"),
            customerContactInput: document.getElementById("credit-customer-contact"),
            customerIdDisplay: document.getElementById("credit-customer-id-display"),
            creditCartTotalDisplay: document.getElementById("credit-cart-total-amount"),
            creditCartItemsList: document.getElementById("credit-cart-items-list"),
            confirmCreditSaleButton: document.getElementById("confirm-credit-sale-button"),
            isSticky: true
        },
        recordPayment: {
            element: document.getElementById("record-payment-modal"),
            customerNameDisplay: document.getElementById("rp-customer-name"),
            totalDueDisplay: document.getElementById("rp-total-due"),
            balanceDisplay: document.getElementById("rp-balance"),
            amountInput: document.getElementById("rp-amount-input"),
            descriptionInput: document.getElementById("rp-description-input"),
            confirmButton: document.getElementById("rp-confirm-payment-button"),
            customerId: null,
            customerBalance: 0,
            isSticky: true
        },
        customerName: {
            element: document.getElementById("customer-name-modal"),
            title: document.getElementById("customer-name-modal-title"),
            input: document.getElementById("modal-customer-name-input"),
            confirmButton: document.getElementById("confirm-customer-name-button"),
            skipButton: document.getElementById("skip-customer-name-button"),
            isSticky: true
        },
        postSaleOptions: {
            element: document.getElementById("post-sale-options-modal"),
            title: document.getElementById("post-sale-options-title"),
            downloadButton: document.getElementById("download-pdf-button"),
            finishButton: document.getElementById("finish-sale-button"),
            isSticky: true
        }
    };
        // --- Lógica de Autenticación de Firebase ---
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User authenticated:", user.uid);
                if (!db) {
                    console.error("Firestore no está inicializado.");
                    if (auth) auth.signOut();
                    showAlert("Error crítico: Base de datos no disponible.", "error");
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
                        mainAppUI.currentUserDisplay.name.textContent = currentUser.username || currentUser.name || user.email || "Usuario";
                        const displayId = user.uid.substring(0, 6) + "...";
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
                        
                        await loadProductsFromFirestore();
                        updateLowStockCount();

                        showToast(`¡Bienvenido, ${currentUser.username || currentUser.name || 'Usuario'}!`, "success", 4000);

                        if (mainAppUI.setTeamMembersButton) {
                            if (currentUser.isTeamAccount) {
                                mainAppUI.setTeamMembersButton.classList.remove('hidden');
                                if (!currentShiftTeamMembers.length && currentShiftName === '') {
                                    showToast("Por favor, configura los miembros del equipo para este turno.", "info", 5000);
                                }
                            } else {
                                mainAppUI.setTeamMembersButton.classList.add('hidden');
                                currentShiftTeamMembers = [];
                                currentShiftName = '';
                            }
                        }

                        await loadCurrentShiftState();

                    } else {
                        console.warn("Usuario autenticado pero sin documento en Firestore:", user.uid);
                        showAlert("Error: No se encontraron datos de usuario. Contacta al administrador.", "error");
                        if (auth) auth.signOut();
                    }
                } catch (error) {
                    console.error("Error obteniendo metadatos de usuario:", error);
                    showAlert("Error al cargar datos de usuario.", "error");
                    if (auth) auth.signOut();
                }
            } else {
                console.log("Usuario no autenticado.");
                currentUser = null;
                cashRegisterOpen = false;
                currentShiftId = null;
                cart = [];
                cartDiscountType = 'none';
                cartDiscountValue = 0;
                cartDiscountAmount = 0;
                updateCartUI();
                if (window._datetimeUpdateInterval) {
                    clearInterval(window._datetimeUpdateInterval);
                    window._datetimeUpdateInterval = null;
                }

                if (mainAppUI.adminOnlyElements)
                    mainAppUI.adminOnlyElements.forEach((el) => el.classList.add("hidden"));
                if (cuadreCajaUI.printReportButton)
                    cuadreCajaUI.printReportButton.classList.add("hidden");
                
                updateLowStockCount();

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
        console.error("Firebase Auth no inicializado.");
    }
    // --- Event Listeners ---
    if (loginForm.loginButton) {
        loginForm.loginButton.addEventListener("click", handleLogin);
        loginForm.usernameInput.addEventListener("keypress", (e) => e.key === "Enter" && handleLogin());
        loginForm.password.addEventListener("keypress", (e) => e.key === "Enter" && handleLogin());
        loginForm.forgotPasswordLink.addEventListener("click", (e) => { e.preventDefault(); handleForgotPassword(); });
    }
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
    if (recoverForm.sendResetEmailButton) {
        recoverForm.sendResetEmailButton.addEventListener("click", sendPasswordResetEmail);
        recoverForm.resetEmailInput.addEventListener("keypress", (e) => e.key === "Enter" && sendPasswordResetEmail());
        recoverForm.backToLoginLink.addEventListener("click", (e) => { e.preventDefault(); showScreen(screens.login); });
    }

    if (mainAppUI.themeToggleButton) mainAppUI.themeToggleButton.addEventListener("click", toggleTheme);
    if (mainAppUI.logoutButton) mainAppUI.logoutButton.addEventListener("click", handleLogout);
    if (mainAppUI.setTeamMembersButton) mainAppUI.setTeamMembersButton.addEventListener('click', () => showModal(modals.setTeamMembers));

    document.querySelectorAll(".nav-list > li > a[data-section]").forEach(link => {
        link?.addEventListener("click", (e) => { e.preventDefault(); showSection(link.dataset.section); });
    });

    if (mainAppUI.discountNavLink) {
        mainAppUI.discountNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('ventas');
            ventasUI.applyPromoSection?.classList.toggle('hidden');
        });
    }
    if (ventasUI.productSearchInput) {
        ventasUI.productSearchInput.addEventListener("input", () => loadProductsFromFirestore(ventasUI.productSearchInput.value, ventasUI.categorySelect?.value));
        ventasUI.productSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const searchTerm = ventasUI.productSearchInput.value.trim();
                if (searchTerm) {
                    addProductToCartByCode(searchTerm);
                    ventasUI.productSearchInput.value = '';
                    loadProductsFromFirestore('', ventasUI.categorySelect?.value);
                }
            }
        });
    }
    if (ventasUI.categorySelect) ventasUI.categorySelect.addEventListener('change', () => loadProductsFromFirestore(ventasUI.productSearchInput?.value, ventasUI.categorySelect.value));
    if (ventasUI.applyManualDiscountButton) ventasUI.applyManualDiscountButton.addEventListener('click', handleApplyManualDiscount);
    if (ventasUI.discountTypeSelect) ventasUI.discountTypeSelect.addEventListener('change', () => ventasUI.discountValueGroup.classList.toggle('hidden', !['percentage', 'fixed'].includes(ventasUI.discountTypeSelect.value)));

    if (cartUI.paymentMethodSelect) cartUI.paymentMethodSelect.addEventListener("change", () => updateChangeDisplay(calculateCartSubtotal() - cartDiscountAmount));
    if (cartUI.amountReceivedInput) cartUI.amountReceivedInput.addEventListener("input", () => updateChangeDisplay(calculateCartSubtotal() - cartDiscountAmount));
    if (cartUI.processSaleButton) cartUI.processSaleButton.addEventListener("click", handleProcessSale);

    if (inventarioUI.addProductButton) inventarioUI.addProductButton.addEventListener("click", () => showModal(modals.product, "add"));
    if (inventarioUI.openInventoryMovementModalButton) inventarioUI.openInventoryMovementModalButton.addEventListener('click', () => {
        populateProductSelectForInventoryMovements();
        showModal(modals.inventoryMovement);
    });

    if (usuariosUI.addUserButton) usuariosUI.addUserButton.addEventListener("click", () => showModal(modals.user, "add"));

    if (salidaEntradaUI.addPettyCashButton) salidaEntradaUI.addPettyCashButton.addEventListener("click", handleRecordPettyCashAddition);
    if (salidaEntradaUI.recordButton) salidaEntradaUI.recordButton.addEventListener("click", handleRecordOutput);
    if (cuadreCajaUI.openCashBtn) cuadreCajaUI.openCashBtn.addEventListener('click', handleOpenCash);
    if (cuadreCajaUI.adminOpenCashBtn) cuadreCajaUI.adminOpenCashBtn.addEventListener('click', () => showModal(modals.adminOpenCashbox));
    if (cuadreCajaUI.cashBalanceBtn) cuadreCajaUI.cashBalanceBtn.addEventListener('click', handleCashBalance);
    if (cuadreCajaUI.closeCashBtn) cuadreCajaUI.closeCashBtn.addEventListener('click', handleCloseCash);
    if (cuadreCajaUI.cashChangeInput) cuadreCajaUI.cashChangeInput.addEventListener('input', updateCashTotals);
    if (cuadreCajaUI.initialCashInput) cuadreCajaUI.initialCashInput.addEventListener('input', updateCashTotals);

    if (cuadreCajaUI.generateReportButton) cuadreCajaUI.generateReportButton.addEventListener("click", generateCashReport);
    if (cuadreCajaUI.searchInvoiceButton) cuadreCajaUI.searchInvoiceButton.addEventListener("click", handleSearchInvoice);
    if (cuadreCajaUI.searchInvoiceInput) cuadreCajaUI.searchInvoiceInput.addEventListener("keypress", (e) => e.key === "Enter" && handleSearchInvoice());
    if (cuadreCajaUI.printReportButton) cuadreCajaUI.printReportButton.addEventListener("click", handlePrintReport);
    if (adminReportsUI.generateAdminReportButton) adminReportsUI.generateAdminReportButton.addEventListener("click", generateAdminReport);
    if (adminReportsUI.generateCommissionDetailsButton) adminReportsUI.generateCommissionDetailsButton.addEventListener("click", generateCommissionDetails);
    if (adminReportsUI.printAdminReportButton) adminReportsUI.printAdminReportButton.addEventListener("click", handlePrintAdminReport);
    // =============================================
    //      AÑADE ESTE NUEVO LISTENER
    // =============================================
    if (cuentasUI.searchInput) {
        cuentasUI.searchInput.addEventListener('input', (e) => {
            loadAccountsReceivable(e.target.value);
        });
    }

    if (modals.adminCode?.verifyButton) {
        modals.adminCode.verifyButton.addEventListener("click", () => {
            if (modals.adminCode.input?.value === ADMIN_CODE) {
                const cb = adminActionCallback;
                hideAllModals();
                if (cb) cb();
            } else {
                showAlert("Código de administrador incorrecto.", "error");
            }
        });
        modals.adminCode.input.addEventListener("keypress", (e) => e.key === "Enter" && modals.adminCode.verifyButton.click());
    }

    if(modals.adminOpenCashbox?.confirmButton) {
        modals.adminOpenCashbox.confirmButton.addEventListener('click', () => {
            const userId = modals.adminOpenCashbox.userSelect.value;
            const selectedOption = modals.adminOpenCashbox.userSelect.options[modals.adminOpenCashbox.userSelect.selectedIndex];
            const userName = selectedOption ? selectedOption.dataset.name : 'Desconocido';
            const initialCash = parseFloat(modals.adminOpenCashbox.initialCashInput.value) || 0;
            const cashChange = parseFloat(modals.adminOpenCashbox.cashChangeInput.value) || 0;

            if (!userId) {
                showAlert("Por favor, selecciona un usuario.", "warning");
                return;
            }
            if (isNaN(initialCash) || initialCash < 0 || isNaN(cashChange) || cashChange < 0) {
                showAlert("Los montos de efectivo deben ser números válidos y no negativos.", "warning");
                return;
            }
            if (initialCash === 0 && cashChange === 0) {
                showAlert("Debes ingresar un monto inicial o de cambio para abrir la caja.", "warning");
                return;
            }
            _performOpenCash(userId, userName, initialCash, cashChange);
        });
    }

    if (modals.invoicePreview?.printButton) {
        const newPrintButton = modals.invoicePreview.printButton.cloneNode(true);
        modals.invoicePreview.printButton.parentNode.replaceChild(newPrintButton, modals.invoicePreview.printButton);
        modals.invoicePreview.printButton = newPrintButton;
        newPrintButton.addEventListener("click", () => {
            if (currentInvoiceId) handlePrintInvoice(currentInvoiceId);
        });
    }
    
    if (modals.invoicePreview?.closeButton) {
        modals.invoicePreview.closeButton.addEventListener("click", () => {
            hideAllModals();
        });
    }

    if (modals.product?.saveButton) modals.product.saveButton.addEventListener("click", handleSaveProduct);
    
    if (modals.user?.saveButton) modals.user.saveButton.addEventListener("click", handleSaveUser);

    if (modals.editCartItem?.saveButton) modals.editCartItem.saveButton.addEventListener("click", handleSaveEditedCartItem);
    if (modals.creditAccount?.confirmCreditSaleButton) modals.creditAccount.confirmCreditSaleButton.addEventListener('click', _confirmCreditSale);
    if (modals.creditAccount?.customerSearchInput) modals.creditAccount.customerSearchInput.addEventListener('input', (e) => searchCustomersForCredit(e.target.value));
    if (modals.recordPayment?.confirmButton) modals.recordPayment.confirmButton.addEventListener('click', _confirmRecordPayment);
    if (modals.inventoryMovement?.saveButton) {
        modals.inventoryMovement.saveButton.addEventListener('click', () => {
            if (currentUser.role === 'colaborator') {
                showModal(modals.adminCode, 'registrar movimiento de inventario', handleRecordInventoryMovement);
            } else {
                handleRecordInventoryMovement();
            }
        });
    }
    if (modals.setTeamMembers?.saveButton) modals.setTeamMembers.saveButton.addEventListener('click', handleSetTeamMembers);
    if (modals.setTeamMembers?.printButton) modals.setTeamMembers.printButton.addEventListener('click', () => printInvoiceContent(generateShiftReportHTML(), "Reporte de Turno"));

    if (modals.confirmAction?.yesButton) modals.confirmAction.yesButton.addEventListener("click", () => {
        const cb = confirmActionCallback;
        hideAllModals();
        if (cb) cb();
    });
    if (modals.confirmAction?.noButton) modals.confirmAction.noButton.addEventListener("click", hideAllModals);

    if (modals.customerName?.confirmButton) modals.customerName.confirmButton.addEventListener('click', () => {
        const customerName = modals.customerName.input.value;
        _finalizeSaleProcessing(customerName);
    });
    if (modals.customerName?.skipButton) modals.customerName.skipButton.addEventListener('click', () => _finalizeSaleProcessing(''));

    if (modals.postSaleOptions?.finishButton) modals.postSaleOptions.finishButton.addEventListener('click', () => {
        hideAllModals();
    });

    document.querySelectorAll(".close-modal-button").forEach(btn => {
        if (btn) btn.addEventListener("click", hideAllModals);
    });

    document.body.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal:not(.hidden)');
            if (activeModal) {
                const modalObj = Object.values(modals).find(m => m.element === activeModal);
                if (!modalObj || !modalObj.isSticky) {
                    hideAllModals();
                }
            }
        }
    });

    // --- App Initialization ---
    const initializeApp = () => {
        const savedTheme = localStorage.getItem("appTheme") || "light";
        applyTheme(savedTheme);
        updateDateTime();
        window._datetimeUpdateInterval = setInterval(updateDateTime, 60000);
        monitorConnectionStatus();

        if (screens.splash) {
            showScreen(screens.splash);
        } else {
            if (!auth || !auth.currentUser) showScreen(screens.login);
        }

        setTimeout(() => {
            if (!auth || !auth.currentUser) {
                if (screens.splash && screens.splash.classList.contains('active')) {
                    showScreen(screens.login);
                }
            }
        }, SPLASH_DURATION);
    };

    if (typeof firebase !== "undefined" && firebase.apps.length > 0 && db && auth) {
        initializeApp();
    } else {
        console.error("Firebase no se pudo inicializar. La aplicación no puede iniciar.");
        const splashText = screens.splash?.querySelector("p");
        if (splashText) splashText.textContent = "Error al cargar la aplicación.";
    }
    const inputsToClear = [cuadreCajaUI.initialCashInput, cuadreCajaUI.cashChangeInput, modals.adminOpenCashbox.initialCashInput, modals.adminOpenCashbox.cashChangeInput];

    inputsToClear.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => {
                if (parseFloat(input.value) === 0) {
                    input.value = '';
                }
            });

            input.addEventListener('blur', () => {
                if (input.value.trim() === '') {
                    input.value = '0.00';
                }
            });
        }
    });

    // --- Comunicación con Electron ---
    try {
        if (window.electronAPI) {
            console.log("[App.js] API de Electron detectada. Configurando listeners.");

            const userGuideOverlay = document.getElementById('user-guide-overlay');
            const okGuideButton = document.getElementById('ok-guide-button');
            const closeGuideButton = document.getElementById('close-guide-button');

            window.electronAPI.on('show-user-guide', () => {
                console.log('[App.js] Orden de mostrar la guía recibida.');
                if (userGuideOverlay) {
                    userGuideOverlay.classList.remove('hidden');
                }
            });

            okGuideButton?.addEventListener('click', () => userGuideOverlay?.classList.add('hidden'));
            closeGuideButton?.addEventListener('click', () => userGuideOverlay?.classList.add('hidden'));

            window.electronAPI.on('log-out-before-quit', async () => {
                console.log('[App.js] Orden de logout recibida.');
                
                if (!auth || !auth.currentUser) {
                    console.log('[App.js] No hay usuario logueado. Confirmando cierre.');
                    window.electronAPI.send('logout-complete');
                    return;
                }

                try {
                    await handleLogout();
                    console.log('[App.js] Logout exitoso.');
                } catch (error) {
                    console.error("[App.js] Error durante el logout:", error);
                } finally {
                    console.log('[App.js] Enviando confirmación de cierre a main.js.');
                    window.electronAPI.send('logout-complete');
                }
            });

        }
    } catch (e) {
        console.warn("API de Electron ('window.electronAPI') no encontrada. Funciones nativas no disponibles.");
    }

    // ... al final de la sección de listeners

    if (modals.adminManageCashbox.forceOpenBtn) {
        modals.adminManageCashbox.forceOpenBtn.addEventListener('click', () => {
            const initialCash = parseFloat(prompt("Ingrese el fondo de caja inicial:", "0.00"));
            if (isNaN(initialCash)) return showAlert("Monto inválido", "error");
            _performOpenCash(selectedUserForCashbox.uid, selectedUserForCashbox.name || selectedUserForCashbox.username, initialCash, 0);
            hideAllModals();
        });
    }

    if (modals.adminManageCashbox.addCashBtn) {
        modals.adminManageCashbox.addCashBtn.addEventListener('click', () => {
             _adminPerformRecordCashMovement('addition', selectedUserForCashbox.uid, selectedUserForCashbox.currentShiftId);
        });
    }

    if (modals.adminManageCashbox.removeCashBtn) {
        modals.adminManageCashbox.removeCashBtn.addEventListener('click', () => {
             _adminPerformRecordCashMovement('outflow', selectedUserForCashbox.uid, selectedUserForCashbox.currentShiftId);
        });
    }

    if (modals.adminManageCashbox.forceCloseBtn) {
        modals.adminManageCashbox.forceCloseBtn.addEventListener('click', () => {
            showModal(modals.confirmAction, "Forzar Cierre de Caja", `¿Seguro que quieres forzar el cierre de caja para ${selectedUserForCashbox.name}?`, async () => {
                // Para simplificar, esta función debe ser completada
                // Requeriría una función similar a _performCashBalance pero para otro usuario
                showAlert("Función de cierre forzado en desarrollo.", "info");
                 // Aquí iría la lógica para cargar los totales del turno del otro usuario y luego llamar a una versión modificada de _performCashBalance
            });
        });
    }

});