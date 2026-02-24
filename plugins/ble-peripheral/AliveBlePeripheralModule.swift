/**
 * AliveBlePeripheralModule — iOS BLE Peripheral (CBPeripheralManager) 네이티브 모듈
 *
 * CBPeripheralManager로 GATT 서비스를 제공하고 BLE 광고를 수행합니다.
 * JS에서 startPeripheral/stopPeripheral/isSupported로 제어합니다.
 */

import Foundation
import CoreBluetooth
import React

@objc(AliveBlePeripheral)
class AliveBlePeripheralModule: NSObject, CBPeripheralManagerDelegate {

  private var peripheralManager: CBPeripheralManager?
  private var userId: String = ""
  private var serviceUuid: CBUUID?
  private var charUuid: CBUUID?

  // Promise 콜백 저장 (비동기 초기화 완료 후 resolve)
  private var startResolve: RCTPromiseResolveBlock?
  private var startReject: RCTPromiseRejectBlock?
  private var pendingService: CBMutableService?

  // MARK: - React Native 메서드

  @objc
  func startPeripheral(
    _ serviceUuidStr: String,
    charUuid charUuidStr: String,
    userId userIdStr: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    self.userId = userIdStr
    self.serviceUuid = CBUUID(string: serviceUuidStr)
    self.charUuid = CBUUID(string: charUuidStr)
    self.startResolve = resolve
    self.startReject = reject

    // CBPeripheralManager 생성 (상태 변경 시 delegate 호출)
    peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
  }

  @objc
  func stopPeripheral(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    peripheralManager?.stopAdvertising()
    peripheralManager?.removeAllServices()
    peripheralManager = nil
    resolve(true)
  }

  @objc
  func isSupported(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    // iOS는 모든 기기가 BLE Peripheral 지원
    resolve(true)
  }

  // MARK: - CBPeripheralManagerDelegate

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      setupService()
    case .poweredOff:
      startReject?("BLE_DISABLED", "블루투스가 꺼져 있습니다", nil)
      startResolve = nil
      startReject = nil
    case .unauthorized:
      startReject?("BLE_UNAUTHORIZED", "BLE 권한이 없습니다", nil)
      startResolve = nil
      startReject = nil
    default:
      break
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    didAdd service: CBService,
    error: Error?
  ) {
    if let error = error {
      startReject?("BLE_SERVICE_ERROR", "서비스 추가 실패: \(error.localizedDescription)", error)
      startResolve = nil
      startReject = nil
      return
    }

    // 서비스 등록 성공 → 광고 시작
    guard let sUuid = serviceUuid else { return }
    peripheral.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [sUuid],
      CBAdvertisementDataLocalNameKey: "ALIVE"
    ])
  }

  func peripheralManagerDidStartAdvertising(
    _ peripheral: CBPeripheralManager,
    error: Error?
  ) {
    if let error = error {
      startReject?("BLE_ADV_FAIL", "BLE 광고 시작 실패: \(error.localizedDescription)", error)
    } else {
      startResolve?(true)
    }
    startResolve = nil
    startReject = nil
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    didReceiveRead request: CBATTRequest
  ) {
    // userId를 UTF-8 바이트로 응답
    guard let cUuid = charUuid, request.characteristic.uuid == cUuid else {
      peripheral.respond(to: request, withResult: .attributeNotFound)
      return
    }

    let data = userId.data(using: .utf8) ?? Data()
    if request.offset > data.count {
      peripheral.respond(to: request, withResult: .invalidOffset)
      return
    }

    request.value = data.subdata(in: request.offset..<data.count)
    peripheral.respond(to: request, withResult: .success)
  }

  // MARK: - Private

  private func setupService() {
    guard let sUuid = serviceUuid, let cUuid = charUuid else { return }

    let characteristic = CBMutableCharacteristic(
      type: cUuid,
      properties: .read,
      value: nil, // nil이면 동적 값 — didReceiveRead에서 응답
      permissions: .readable
    )

    let service = CBMutableService(type: sUuid, primary: true)
    service.characteristics = [characteristic]

    peripheralManager?.add(service)
  }

  // MARK: - React Native 모듈 설정

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
