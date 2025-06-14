package com.minegocio.pos.lahotdogueriapos

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bluetoothJsInterface: BluetoothJsInterface

    private val bluetoothAdapter: BluetoothAdapter? by lazy(LazyThreadSafetyMode.NONE) {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothManager.adapter
    }

    private val requestBluetoothPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            val granted = permissions.entries.all { it.value }
            val grantResults = if (granted) {
                IntArray(permissions.size) { PackageManager.PERMISSION_GRANTED }
            } else {
                permissions.values.map { if (it) PackageManager.PERMISSION_GRANTED else PackageManager.PERMISSION_DENIED }.toIntArray()
            }
            bluetoothJsInterface.handlePermissionResult(BluetoothJsInterface.BLUETOOTH_PERMISSION_REQUEST_CODE, grantResults)
        }

    private val enableBluetoothLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            bluetoothJsInterface.handleBluetoothEnableResult(BluetoothJsInterface.ENABLE_BLUETOOTH_REQUEST_CODE, result.resultCode)
        }


    override fun onCreate(savedInstanceState: Bundle?) {
                super.onCreate(savedInstanceState)
                setContentView(R.layout.activity_main)

                webView = findViewById<WebView>(R.id.webView)
                setupWebView()
                 
                bluetoothJsInterface = BluetoothJsInterface(this, webView, lifecycleScope)
                webView.addJavascriptInterface(bluetoothJsInterface, "AndroidBluetooth")

                bluetoothJsInterface.setPermissionCallback(object : BluetoothJsInterface.PermissionCallback {
                    override fun onRequestBluetoothPermissions(permissions: Array<String>, requestCode: Int) {
                        requestBluetoothPermissions.launch(permissions)
                    }

                    override fun onEnableBluetooth(requestCode: Int) {
                        val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                        enableBluetoothLauncher.launch(enableBtIntent)
                    }
                })
                webView.loadUrl("https://la-hotdogeria.web.app/")

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    WebView.setWebContentsDebuggingEnabled(true)
                }
    }

    private fun setupWebView() {
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.allowFileAccess = true

        webSettings.allowContentAccess = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        webSettings.loadWithOverviewMode = true
        webSettings.useWideViewPort = true
        webSettings.setSupportZoom(true)
        webSettings.builtInZoomControls = true
        webSettings.displayZoomControls = false

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false

                if (url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("WebViewClient", "Error al abrir URL externa: $url", e)
                        Toast.makeText(this@MainActivity, "No se puede abrir este tipo de enlace: $url", Toast.LENGTH_SHORT).show()
                        return true
                    }
                }
                view?.loadUrl(url)
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("MainActivity", "Página finalizó de cargar: $url")
                view?.evaluateJavascript("window.AndroidBluetooth.onPageLoaded();", null)
                updateBluetoothStateForJs()
            }

            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                Log.e("MainActivity", "Error de WebView: Código=$errorCode, Descripción=$description, URL=$failingUrl")
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Error al cargar la página: $description", Toast.LENGTH_LONG).show()
                }
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    private fun updateBluetoothStateForJs() {
        if (bluetoothAdapter?.isEnabled == true) {
            val connectedDeviceAddress = bluetoothJsInterface.getConnectedDeviceAddress()
            if (connectedDeviceAddress != null) {
                bluetoothJsInterface.callJsFunction("onBluetoothConnected", connectedDeviceAddress)
            } else {
                bluetoothJsInterface.callJsFunction("onBluetoothDisconnected")
            }
        } else {
            bluetoothJsInterface.callJsFunction("onBluetoothDisconnected")
            bluetoothJsInterface.callJsFunction("onBluetoothError", "Bluetooth no está activado.")
        }
    }

    override fun onResume() {
        super.onResume()
        bluetoothJsInterface.registerBluetoothReceiver()
        updateBluetoothStateForJs()
    }

    override fun onPause() {
        super.onPause()
        bluetoothJsInterface.unregisterBluetoothReceiver()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        bluetoothJsInterface.destroy()
        webView.destroy()
    }
}