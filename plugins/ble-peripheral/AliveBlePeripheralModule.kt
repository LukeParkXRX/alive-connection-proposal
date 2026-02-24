/**
 * AliveBlePeripheralModule — Android BLE GATT 서버 + 광고 네이티브 모듈
 *
 * BluetoothGattServer로 SERVICE_UUID 서비스를 제공하고,
 * BluetoothLeAdvertiser로 해당 서비스를 광고합니다.
 * JS에서 startPeripheral/stopPeripheral로 제어합니다.
 */

package com.xrx.aliveconnection

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import java.util.UUID

class AliveBlePeripheralModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AliveBlePeripheral"

    private var gattServer: BluetoothGattServer? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var isRunning = false

    /**
     * BLE Peripheral(GATT 서버 + 광고) 시작
     * @param serviceUuid 서비스 UUID 문자열
     * @param charUuid userId characteristic UUID 문자열
     * @param userId 광고할 유저 ID
     */
    @ReactMethod
    fun startPeripheral(serviceUuid: String, charUuid: String, userId: String, promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext
                .getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bluetoothManager?.adapter

            if (adapter == null || !adapter.isEnabled) {
                promise.reject("BLE_DISABLED", "블루투스가 꺼져 있습니다")
                return
            }

            val sUuid = UUID.fromString(serviceUuid)
            val cUuid = UUID.fromString(charUuid)

            // 1. GATT 서버 생성
            val gattCallback = object : BluetoothGattServerCallback() {
                override fun onCharacteristicReadRequest(
                    device: BluetoothDevice?,
                    requestId: Int,
                    offset: Int,
                    characteristic: BluetoothGattCharacteristic?
                ) {
                    // userId를 UTF-8 바이트로 응답
                    val value = userId.toByteArray(Charsets.UTF_8)
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_SUCCESS,
                        offset,
                        if (offset > 0) value.copyOfRange(offset, value.size) else value
                    )
                }

                override fun onConnectionStateChange(
                    device: BluetoothDevice?,
                    status: Int,
                    newState: Int
                ) {
                    // 연결/해제 로깅 (필요시 JS 이벤트 발행 가능)
                }
            }

            gattServer = bluetoothManager.openGattServer(reactApplicationContext, gattCallback)

            // 서비스 + characteristic 등록
            val service = BluetoothGattService(sUuid, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            val characteristic = BluetoothGattCharacteristic(
                cUuid,
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ
            )
            characteristic.value = userId.toByteArray(Charsets.UTF_8)
            service.addCharacteristic(characteristic)
            gattServer?.addService(service)

            // 2. BLE 광고 시작
            advertiser = adapter.bluetoothLeAdvertiser
            if (advertiser == null) {
                promise.reject("BLE_NO_ADVERTISER", "이 기기는 BLE 광고를 지원하지 않습니다")
                return
            }

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(true)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(ParcelUuid(sUuid))
                .build()

            advertiser?.startAdvertising(settings, data, object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                    isRunning = true
                    promise.resolve(true)
                }

                override fun onStartFailure(errorCode: Int) {
                    promise.reject(
                        "BLE_ADV_FAIL",
                        "BLE 광고 시작 실패 (코드: $errorCode)"
                    )
                }
            })
        } catch (e: SecurityException) {
            promise.reject("BLE_PERMISSION", "BLE 권한이 없습니다: ${e.message}")
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", "BLE Peripheral 시작 실패: ${e.message}")
        }
    }

    /**
     * BLE Peripheral(GATT 서버 + 광고) 중지
     */
    @ReactMethod
    fun stopPeripheral(promise: Promise) {
        try {
            advertiser?.stopAdvertising(object : AdvertiseCallback() {})
            gattServer?.clearServices()
            gattServer?.close()
            gattServer = null
            advertiser = null
            isRunning = false
            promise.resolve(true)
        } catch (e: SecurityException) {
            promise.reject("BLE_PERMISSION", "BLE 권한이 없습니다: ${e.message}")
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", "BLE Peripheral 중지 실패: ${e.message}")
        }
    }

    /**
     * 이 기기에서 BLE Peripheral 지원 여부 확인
     */
    @ReactMethod
    fun isSupported(promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext
                .getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bluetoothManager?.adapter
            val supported = adapter?.isMultipleAdvertisementSupported == true
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
