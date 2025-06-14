package com.minegocio.pos.lahotdogueriapos

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.util.Log
import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

class BluetoothJsInterface(
    private val context: Context,
    private val webView: WebView,
    private val scope: CoroutineScope // Recibe el lifecycleScope de la Activity
) {

    companion object {
        const val BLUETOOTH_PERMISSION_REQUEST_CODE = 100
        const val ENABLE_BLUETOOTH_REQUEST_CODE = 101
    }

    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private val bluetoothAdapter: BluetoothAdapter? by lazy(LazyThreadSafetyMode.NONE) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothManager.adapter
    }

    private var connectedDevice: BluetoothDevice? = null
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    interface PermissionCallback {
        fun onRequestBluetoothPermissions(permissions: Array<String>, requestCode: Int)
        fun onEnableBluetooth(requestCode: Int)
    }

    private var permissionCallback: PermissionCallback? = null

    fun setPermissionCallback(callback: PermissionCallback) {
        this.permissionCallback = callback
    }

    @SuppressLint("MissingPermission")
    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    device?.let {
                        val deviceName = it.name ?: "Dispositivo Desconocido"
                        val deviceAddress = it.address
                        Log.d("BluetoothJsInterface", "Dispositivo encontrado: $deviceName ($deviceAddress)")
                        callJsFunction("onBluetoothDeviceFound", deviceName, deviceAddress)
                    }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                    Log.d("BluetoothJsInterface", "Descubrimiento finalizado.")
                    callJsFunction("onBluetoothScanFinished")
                }
                BluetoothAdapter.ACTION_STATE_CHANGED -> {
                    val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                    when (state) {
                        BluetoothAdapter.STATE_ON -> {
                            Log.d("BluetoothJsInterface", "Bluetooth activado.")
                            callJsFunction("onBluetoothEnabled")
                        }
                        BluetoothAdapter.STATE_OFF -> {
                            Log.d("BluetoothJsInterface", "Bluetooth desactivado.")
                            callJsFunction("onBluetoothDisconnected")
                            disconnectBluetoothDeviceInternal()
                        }
                    }
                }
                BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
                    val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    device?.let {
                        if (it.address == connectedDevice?.address) {
                            Log.d("BluetoothJsInterface", "Dispositivo ${it.name ?: it.address} desconectado inesperadamente.")
                            callJsFunction("onBluetoothDisconnected")
                            disconnectBluetoothDeviceInternal()
                        }
                    }
                }
            }
        }
    }

    fun registerBluetoothReceiver() {
        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
            addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
        }
        context.registerReceiver(bluetoothReceiver, filter)
        Log.d("BluetoothJsInterface", "BroadcastReceiver registrado.")
    }

    fun unregisterBluetoothReceiver() {
        try {
            context.unregisterReceiver(bluetoothReceiver)
            Log.d("BluetoothJsInterface", "BroadcastReceiver desregistrado.")
        } catch (e: IllegalArgumentException) {
            Log.w("BluetoothJsInterface", "Receiver no estaba registrado. ${e.message}")
        }
    }

    public fun callJsFunction(functionName: String, vararg args: Any?) {
        val argString = args.joinToString(",") { arg ->
            when (arg) {
                is String -> "\"${arg.replace("\"", "\\\"").replace("\n", "\\n")}\""
                is Int, is Double, is Boolean -> arg.toString()
                else -> "null"
            }
        }
        val javascript = "javascript:window.AndroidBluetooth.$functionName($argString);"
        Log.d("WebViewCallback", "Ejecutando JS: $javascript")
        webView.post {
            webView.evaluateJavascript(javascript, null)
        }
    }

    @JavascriptInterface
    fun requestBluetoothPermission() {
        Log.d("BluetoothJsInterface", "requestBluetoothPermission llamado desde JS")
        val permissionsToRequest = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH)
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADMIN)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            permissionCallback?.onRequestBluetoothPermissions(permissionsToRequest.toTypedArray(), BLUETOOTH_PERMISSION_REQUEST_CODE)
        } else {
            callJsFunction("onBluetoothPermissionGranted")
            checkBluetoothState()
        }
    }

    fun handlePermissionResult(requestCode: Int, grantResults: IntArray) {
        if (requestCode == BLUETOOTH_PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                callJsFunction("onBluetoothPermissionGranted")
                checkBluetoothState()
            } else {
                val deniedPermissionsNames = mutableListOf<String>()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("BLUETOOTH_SCAN")
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("BLUETOOTH_CONNECT")
                }
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("ACCESS_FINE_LOCATION")
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("ACCESS_COARSE_LOCATION")
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("BLUETOOTH")
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) != PackageManager.PERMISSION_GRANTED) deniedPermissionsNames.add("BLUETOOTH_ADMIN")
                }

                callJsFunction("onBluetoothPermissionDenied", "Permisos denegados: ${deniedPermissionsNames.joinToString(", ")}")
                Toast.makeText(context, "Permisos Bluetooth necesarios para imprimir denegados.", Toast.LENGTH_LONG).show()
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun checkBluetoothState() {
        if (bluetoothAdapter == null) {
            callJsFunction("onBluetoothError", "El dispositivo no soporta Bluetooth.")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            callJsFunction("onBluetoothError", "Permiso BLUETOOTH_CONNECT no concedido para verificar el estado de Bluetooth.")
            return
        }

        if (!bluetoothAdapter!!.isEnabled) {
            callJsFunction("onBluetoothError", "Bluetooth no está activado.")
        } else {
            callJsFunction("onBluetoothEnabled")
        }
    }

    fun handleBluetoothEnableResult(requestCode: Int, resultCode: Int) {
        if (requestCode == ENABLE_BLUETOOTH_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                callJsFunction("onBluetoothEnabled")
                Toast.makeText(context, "Bluetooth activado.", Toast.LENGTH_SHORT).show()
            } else {
                callJsFunction("onBluetoothError", "Bluetooth no fue activado por el usuario.")
                Toast.makeText(context, "Bluetooth no activado. No se puede conectar.", Toast.LENGTH_LONG).show()
            }
        }
    }

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun scanBluetoothDevices() {
        Log.d("BluetoothJsInterface", "scanBluetoothDevices llamado desde JS")
        if (bluetoothAdapter == null) {
            callJsFunction("onBluetoothError", "El dispositivo no soporta Bluetooth.")
            return
        }
        if (!bluetoothAdapter!!.isEnabled) {
            callJsFunction("onBluetoothError", "Bluetooth no está activado. Por favor, actívalo desde la configuración de la app o el sistema.")
            permissionCallback?.onEnableBluetooth(ENABLE_BLUETOOTH_REQUEST_CODE)
            return
        }

        val hasScanPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        val hasLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasScanPermission || !hasLocationPermission) {
            callJsFunction("onBluetoothPermissionDenied", "Permisos BLUETOOTH_SCAN/ADMIN y ACCESS_FINE_LOCATION necesarios para escanear. Solicítalos de nuevo.")
            requestBluetoothPermission()
            return
        }

        scope.launch {
            if (bluetoothAdapter!!.isDiscovering) {
                bluetoothAdapter!!.cancelDiscovery()
                Log.d("BluetoothJsInterface", "Discovery anterior cancelado.")
            }

            Log.d("BluetoothJsInterface", "Iniciando descubrimiento Bluetooth...")
            val started = bluetoothAdapter!!.startDiscovery()
            if (!started) {
                callJsFunction("onBluetoothError", "No se pudo iniciar el escaneo de dispositivos Bluetooth.")
            } else {
                callJsFunction("onBluetoothScanStarted")
            }
        }
    }

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun cancelBluetoothScan() {
        Log.d("BluetoothJsInterface", "cancelBluetoothScan llamado desde JS")
        scope.launch {
            if (bluetoothAdapter != null && bluetoothAdapter!!.isDiscovering) {
                bluetoothAdapter!!.cancelDiscovery()
                callJsFunction("onBluetoothScanFinished")
            }
        }
    }

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun connectBluetoothDevice(address: String) {
        Log.d("BluetoothJsInterface", "connectBluetoothDevice llamado desde JS con dirección: $address")
        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            callJsFunction("onBluetoothError", "Bluetooth no disponible o no activado.")
            permissionCallback?.onEnableBluetooth(ENABLE_BLUETOOTH_REQUEST_CODE)
            return
        }
        if (address.isBlank()) {
            callJsFunction("onBluetoothError", "La dirección del dispositivo no puede estar vacía.")
            return
        }

        val hasConnectPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        if (!hasConnectPermission) {
            callJsFunction("onBluetoothPermissionDenied", "Permiso BLUETOOTH_CONNECT denegado. Solicítalo de nuevo.")
            requestBluetoothPermission()
            return
        }

        scope.launch {
            try {
                if (bluetoothAdapter!!.isDiscovering) {
                    bluetoothAdapter!!.cancelDiscovery()
                }

                val device = bluetoothAdapter!!.getRemoteDevice(address)
                connectedDevice = device

                disconnectBluetoothDeviceInternal()

                bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)

                bluetoothSocket!!.connect()
                outputStream = bluetoothSocket!!.outputStream

                Log.d("BluetoothJsInterface", "Conectado a dispositivo: ${device.name ?: device.address}")
                callJsFunction("onBluetoothConnected", address)

            } catch (e: IOException) {
                Log.e("BluetoothJsInterface", "Error conectando a dispositivo: ${e.message}", e)
                callJsFunction("onBluetoothError", "Fallo al conectar con el dispositivo: ${e.message}")
                disconnectBluetoothDeviceInternal()
            } catch (e: SecurityException) {
                Log.e("BluetoothJsInterface", "SecurityException conectando: ${e.message}", e)
                callJsFunction("onBluetoothError", "Permiso BLUETOOTH_CONNECT denegado. Asegúrate de concederlo.")
                disconnectBluetoothDeviceInternal()
            } catch (e: IllegalArgumentException) {
                Log.e("BluetoothJsInterface", "Dirección Bluetooth inválida: ${e.message}", e)
                callJsFunction("onBluetoothError", "Dirección Bluetooth inválida. Asegúrate de que sea una dirección MAC válida.")
                disconnectBluetoothDeviceInternal()
            }
        }
    }

    @JavascriptInterface
    fun printThermalData(base64Data: String) {
        Log.d("BluetoothJsInterface", "printThermalData llamado desde JS con longitud de datos: ${base64Data.length}")
        if (outputStream == null || bluetoothSocket?.isConnected != true) {
            callJsFunction("onBluetoothError", "No hay impresora conectada o el stream de salida es nulo.")
            return
        }
        if (base64Data.isBlank()) {
            callJsFunction("onBluetoothError", "Los datos a imprimir no pueden estar vacíos.")
            return
        }

        scope.launch {
            try {
                val data = Base64.decode(base64Data, Base64.DEFAULT)
                outputStream!!.write(data)
                outputStream!!.flush()

                Log.d("BluetoothJsInterface", "Datos enviados a la impresora exitosamente.")
                callJsFunction("onBluetoothPrintSuccess")
            } catch (e: IOException) {
                Log.e("BluetoothJsInterface", "Error enviando datos a la impresora: ${e.message}", e)
                callJsFunction("onBluetoothError", "Fallo al imprimir: ${e.message}")
                disconnectBluetoothDeviceInternal()
            } catch (e: IllegalArgumentException) {
                Log.e("BluetoothJsInterface", "Datos Base64 inválidos: ${e.message}", e)
                callJsFunction("onBluetoothError", "Error: Datos de impresión inválidos (Base64).")
            }
        }
    }

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun disconnectBluetoothDevice() {
        Log.d("BluetoothJsInterface", "disconnectBluetoothDevice llamado desde JS")
        scope.launch {
            disconnectBluetoothDeviceInternal()
        }
    }

    @SuppressLint("MissingPermission")
    private fun disconnectBluetoothDeviceInternal() {
        try {
            outputStream?.close()
            outputStream = null
        } catch (e: IOException) {
            Log.e("BluetoothJsInterface", "Error cerrando outputStream: ${e.message}", e)
        }
        try {
            bluetoothSocket?.close()
            bluetoothSocket = null
        } catch (e: IOException) {
            Log.e("BluetoothJsInterface", "Error cerrando bluetoothSocket: ${e.message}", e)
        }
        connectedDevice = null
        Log.d("BluetoothJsInterface", "Dispositivo Bluetooth desconectado.")
        callJsFunction("onBluetoothDisconnected")
    }

    @JavascriptInterface
    fun getConnectedDeviceAddress(): String? {
        return connectedDevice?.address
    }

    fun destroy() {
        disconnectBluetoothDeviceInternal()
        scope.cancel()
        Log.d("BluetoothJsInterface", "BluetoothJsInterface destruida y recursos liberados.")
    }
}