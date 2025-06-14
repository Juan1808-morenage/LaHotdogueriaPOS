# Guía de Usuario - Sistema POS La Hotdoguería RD

¡Bienvenido al sistema de Punto de Venta de La Hotdoguería RD! Esta guía te ayudará a entender y utilizar todas las funciones del programa, desde abrir la caja hasta generar reportes avanzados.

### **Índice**
1.  [Inicio de Sesión y Pantalla Principal](#1-inicio-de-sesión-y-pantalla-principal)
2.  [Gestión de Turnos de Caja](#2-gestión-de-turnos-de-caja)
3.  [Sección de Ventas: El Corazón del Sistema](#3-sección-de-ventas-el-corazón-del-sistema)
4.  [Sección de Salida/Entrada de Efectivo](#4-sección-de-salidaentrada-de-efectivo)
5.  [Sección de Inventario](#5-sección-de-inventario)
6.  [Gestión de Cuentas por Cobrar (Crédito)](#6-gestión-de-cuentas-por-cobrar-crédito)
7.  [Secciones de Administrador](#7-secciones-de-administrador)
    *   [Gestión de Usuarios](#gestión-de-usuarios)
    *   [Reportes de Administrador](#reportes-de-administrador)
8.  [Funcionalidad Offline](#8-funcionalidad-offline)

---

### **1. Inicio de Sesión y Pantalla Principal**

*   **Login:** Para ingresar, utiliza el `Nombre de Usuario` y la `Contraseña` asignados por el administrador.
*   **Recuperar Contraseña:** Si olvidaste tu contraseña, haz clic en `¿Olvidaste tu contraseña?`. Se te pedirá tu email registrado para enviarte un enlace de recuperación.
*   **Seguridad de Sesión:** Al cerrar la aplicación (haciendo clic en la "X" de la ventana), tu sesión se cerrará automáticamente por seguridad. Al volver a abrirla, deberás iniciar sesión de nuevo.
*   **Interfaz Principal:**
    *   **Barra de Navegación (Izquierda):** Te permite moverte entre las diferentes secciones: Ventas, Caja (Turno), Inventario, etc.
    *   **Barra Superior:** Muestra tu nombre de usuario, la fecha/hora, un **indicador de conexión** (En Línea/Offline) y los botones para cambiar el tema (claro/oscuro) y cerrar sesión.

---

### **2. Gestión de Turnos de Caja**

Esta es la primera y más importante sección que debes visitar cada día. **No puedes realizar ventas ni movimientos si la caja no está abierta.**

*   **Abrir Caja:**
    1.  Ve a la sección **"Caja (Turno)"**.
    2.  En el cuadro "Entradas de Efectivo", ingresa el monto de `Dinero Inicial en Caja` y el `Cambio Inicial`.
    3.  Haz clic en el botón verde **"Abrir Caja"**. Si eres colaborador, puede requerir un código de administrador.
    4.  Una vez abierta, los botones para vender y registrar movimientos en todo el sistema se activarán.

*   **Dashboard del Turno Actual (en "Caja (Turno)"):**
    *   Aquí verás un resumen en tiempo real de tu turno: ventas, movimientos y el total de efectivo esperado.
    *   También verás **gráficos actualizados al instante** que muestran las ventas por categoría y los métodos de pago más usados durante tu turno.

*   **Cuadre Parcial ("Cuadrar Caja"):**
    *   Permite contar el dinero en caja en cualquier momento para verificar que todo esté correcto, **sin cerrar el turno**. Es útil para detectar descuadres a mitad de jornada.

*   **Cerrar Caja (Fin de Turno):**
    1.  Al final de tu jornada, haz clic en el botón rojo **"Cerrar Caja"**.
    2.  Se te pedirá confirmar la acción. Luego, aparecerá un modal donde debes ingresar el **conteo físico del efectivo** que tienes.
    3.  El sistema calculará automáticamente si hay sobrantes o faltantes y guardará el registro.
    4.  **IMPORTANTE:** Al confirmar, el turno se cierra permanentemente. Todos los datos se guardan en el historial y la pantalla se limpia para el siguiente usuario.

---

### **3. Sección de Ventas: El Corazón del Sistema**

Aquí es donde registras las compras de los clientes.

*   **Añadir Productos al Carrito:**
    *   **Por Clic:** Simplemente haz clic en la tarjeta del producto que deseas vender.
    *   **Por Búsqueda/Categoría:** Usa la barra de búsqueda para encontrar productos por nombre o código. También puedes usar el menú desplegable para filtrar por categoría.

*   **El Carrito de Compras (Panel Derecho):**
    *   **Editar y Eliminar:** Puedes modificar la cantidad y el precio (si tienes permiso) de los productos o quitarlos del carrito usando los iconos junto a cada item.
    *   **Método de Pago:** Selecciona si el cliente paga con `Efectivo`, `Tarjeta`, `Transferencia` o `Crédito`.
    *   **Pago en Efectivo:** Si eliges `Efectivo`, ingresa el monto recibido en el campo correspondiente para que el sistema calcule el cambio exacto.

*   **Procesar Venta (Flujo Actualizado):**
    1.  Cuando todo esté correcto en el carrito, haz clic en **"Procesar Venta"**.
    2.  Aparecerá una pequeña ventana para que escribas el **nombre del cliente**. Esto es **opcional**, pero muy útil para buscar sus facturas después. Puedes dejarlo en blanco u omitirlo.
    3.  El sistema guardará la venta y descontará los productos del inventario.
    4.  Finalmente, se mostrará una ventana con dos opciones:
        *   `Descargar PDF`: Crea y descarga un archivo PDF de la factura en tu dispositivo, ideal para enviar por mensajería.
        *   `Finalizar`: Simplemente cierra la ventana y te permite continuar con la siguiente venta.

---

### **4. Sección de Salida/Entrada de Efectivo**

Usa esta sección para registrar cualquier movimiento de dinero que **no sea una venta**. Esto es crucial para un cuadre de caja preciso.

*   **Entrada de Efectivo:** Si se añade dinero a la caja (ej: más fondo para cambio, un socio aporta capital).
*   **Salida de Efectivo:** Si se retira dinero de la caja (ej: pago a un proveedor, compra de un botellón de agua).

> Ambas acciones se registran en el historial del turno y pueden requerir código de administrador.

---

### **5. Sección de Inventario**

Aquí puedes ver y gestionar todos tus productos.

*   **Ver Inventario:** La tabla muestra detalles completos. Los productos con bajo stock se marcan en amarillo y los agotados en rojo para una fácil identificación. En la sección de admin, la tabla muestra la **ganancia en pesos** por unidad.
*   **Añadir/Editar Producto (Admin):** El administrador puede crear nuevos productos o modificar los existentes.
    *   **Cálculo de Costo:** Al añadir o editar, puedes usar los campos `Precio Caja` y `Unidades por Caja` para que el sistema calcule el `Costo por Unidad` automáticamente, agilizando la entrada de datos.
*   **Movimiento de Inventario:** Usa el botón **"Registrar Movimiento"** para documentar:
    *   **Entradas:** Cuando recibes nueva mercancía de proveedores.
    *   **Salidas por Merma/Daño:** Para registrar productos que se dañaron o vencieron.
    *   **Salidas por Uso Interno:** Para productos consumidos por el personal.

---

### **6. Gestión de Cuentas por Cobrar (Crédito)**

*   **Realizar una Venta a Crédito:**
    1.  En la sección de "Ventas", añade productos al carrito como de costumbre.
    2.  En el carrito, selecciona `Crédito` como método de pago y procesa la venta.
    3.  Aparecerá un modal donde puedes **buscar un cliente existente** por nombre o **crear uno nuevo** ingresando su nombre y contacto.
    4.  Confirma para registrar la venta y añadir la deuda a la cuenta de ese cliente.

*   **Abonar a una Deuda (Admin):**
    1.  Ve a la sección **"Reportes Admin"**.
    2.  Genera un reporte. En la sección "Cuentas por Cobrar", busca al cliente en la tabla interactiva.
    3.  Haz clic en el botón **"Abonar"** junto al nombre del cliente.
    4.  Ingresa el monto del pago para actualizar su saldo pendiente. El sistema registrará la fecha y el monto del abono.

---

### **7. Secciones de Administrador**

Estas secciones solo son visibles para usuarios con rol de "Administrador".

#### **Gestión de Usuarios**
*   Crea, edita o elimina los perfiles de los empleados.
*   Asigna roles (`Administrador` o `Colaborador`), configura si una cuenta es de equipo (para turnos compartidos) y establece las **reglas de comisión** por venta general o por venta de productos específicos como hotdogs.

#### **Reportes de Administrador**
Esta es la herramienta de análisis más potente. Selecciona un **rango de fechas** y, opcionalmente, un empleado para filtrar los datos.

*   **Botón `Generar Reporte General`:** Muestra un dashboard completo con:
    *   **Resumen Financiero:** Totales de ventas, ganancias y desglose por métodos de pago.
    *   **Indicadores de Rendimiento (KPIs):** Tarjetas que destacan al "Usuario con Mayores Ventas" y al "Usuario con Mayor Comisión".
    *   **Gráficos Avanzados:** Tendencia de ventas y ganancias a lo largo del tiempo, y comisiones apiladas por empleado.
    *   **Tablas Detalladas:** Historial de cuadres de caja, estado de cuentas por cobrar y lista de todas las ventas del período.

*   **Botón `Ver Comisiones Detalladas`:**
    *   Genera una **tabla específica** que muestra cada comisión ganada, una por una.
    *   Especifica quién la ganó, en qué venta, de qué tipo fue (General o por Hotdog) y el monto exacto.
    *   Este reporte detallado tiene su propio botón para **descargar un PDF**, ideal para la transparencia en el pago de comisiones.

---

### **8. Funcionalidad Offline**

El sistema está diseñado para seguir funcionando incluso si pierdes la conexión a internet.

*   **Modo Offline:** Si la conexión se cae, el indicador en la barra superior cambiará a "Offline". Podrás seguir registrando ventas y movimientos sin interrupción.
*   **Almacenamiento Local:** Todos los datos generados (ventas, movimientos de caja, etc.) se guardan de forma segura en tu dispositivo.
*   **Sincronización Automática:** En cuanto la conexión a internet se restablezca, el indicador volverá a "En Línea" y el sistema sincronizará automáticamente todos los datos guardados con la nube, sin que tengas que hacer nada.