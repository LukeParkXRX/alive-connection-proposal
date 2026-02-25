# ALIVE BLE Protocol Specification v1.0

> 작성일: 2026-02-25
> 구현 코드: `src/constants/ble.ts`, `src/services/ble/BLEScanner.ts`

---

## 1. Service & Characteristic 정의

| UUID | 용도 | 접근 |
|------|------|------|
| `A11FE000-C0FF-EC10-8000-000500D10000` | ALIVE Service | — |
| `A11FE001-C0FF-EC10-8000-000500D10000` | userId | Read |
| `A11FE002-C0FF-EC10-8000-000500D10000` | 교환 요청 | Write |
| `A11FE003-C0FF-EC10-8000-000500D10000` | 교환 응답 | Notify |

UUID 명명 규칙: `A11FE` = ALIVE 시그니처, `C0FF EC10` = Connection, `000500D10000` = 고유 식별

---

## 2. Advertising 설정

```typescript
{
  localName: 'ALIVE',
  txPowerLevel: 'medium',
  connectable: true,
  serviceUUIDs: ['A11FE000-C0FF-EC10-8000-000500D10000']
}
```

---

## 3. Manufacturer Data (Fast Path)

### 바이너리 포맷
```
Offset  Size  Field         Description
------  ----  -----------   -----------
0       1     sig[0]        0xA1 (ALIVE 시그니처 첫 바이트)
1       1     sig[1]        0x1F (ALIVE 시그니처 둘째 바이트)
2       1     version       프로토콜 버전 (현재: 0x01)
3       1     dataType      데이터 종류 (0x01 = userId)
4       16    userId        UUID 바이너리 (하이픈 제거, hex → bytes)
------  ----
Total: 20 bytes
```

### 인코딩 (송출 측)
1. userId UUID에서 하이픈 제거: `550e8400-e29b-...` → `550e8400e29b...`
2. hex 문자열을 16바이트 바이너리로 변환
3. 시그니처(2) + 버전(1) + 타입(1) + userId(16) = 20바이트 조립

### 디코딩 (수신 측, BLEScanner.ts)
1. Manufacturer Data에서 처음 2바이트 확인: `0xA1`, `0x1F`
2. 시그니처 일치 → 바이트 4부터 16바이트 추출
3. 바이너리를 hex 문자열로 변환 → 하이픈 삽입하여 UUID 복원

### 처리 시간
- Fast Path 성공: ~100ms (GATT 연결 불필요)
- 실패 시 GATT Fallback으로 전환

---

## 4. GATT 교환 (Fallback Path)

### 시나리오
Manufacturer Data에서 ALIVE 시그니처를 찾지 못한 경우 (일부 Android 기기에서 발생 가능)

### 플로우
```
Scanner                          Peripheral
  │                                  │
  │ 1. connectToDevice(deviceId)     │
  │ ─────────────────────────────►   │
  │                                  │
  │ 2. discoverAllServicesAndCharacteristics()
  │ ─────────────────────────────►   │
  │                                  │
  │ 3. readCharacteristic(           │
  │      SERVICE_UUID,               │
  │      CHAR_USER_ID)               │
  │ ─────────────────────────────►   │
  │                                  │
  │ 4. userId (UTF-8 string)         │
  │ ◄─────────────────────────────   │
  │                                  │
  │ 5. cancelConnection()            │
  │ ─────────────────────────────►   │
```

### 타임아웃
- GATT 연결: 10초 (`CONNECTION_TIMEOUT`)
- 타임아웃 시 해당 기기 무시 (5분 캐시)

---

## 5. RSSI 근접 모델

| RSSI (dBm) | 추정 거리 | 동작 |
|------------|----------|------|
| -20 ~ -30 | ~5cm | 즉시 교환 |
| -30 ~ -35 | ~10cm | 자동 교환 트리거 (`RSSI_VERY_CLOSE`) |
| -35 ~ -50 | 10~30cm | 발견 알림 (`RSSI_THRESHOLD`) |
| < -50 | 30cm+ | 무시 |

### 환경 변수
- 벽, 인체, 전자기 간섭에 의해 ±30% 오차 발생 가능
- 50명+ 밀집 환경에서 추가 필터링 로직 필요

---

## 6. 캐시 & 디바운싱

| 항목 | 값 | 설명 |
|------|---|------|
| Discovery Cache TTL | 5분 | 동일 기기 중복 감지 방지 |
| Deep Link Debounce | 10초 | 동일 userId 중복 교환 방지 |
| Scan Interval (Foreground) | 2초 | 앱 활성 시 스캔 주기 |
| Scan Interval (Background) | 10초 | 백그라운드 시 (미구현) |

---

## 7. 크로스 플랫폼 동작 차이

| 항목 | Android | iOS |
|------|---------|-----|
| BLE Peripheral | BluetoothGattServer + BluetoothLeAdvertiser | CBPeripheralManager |
| 백그라운드 광고 | Foreground Service로 가능 | 제한적 (UUID만, 이름 제거) |
| Manufacturer Data | 자유롭게 포함 가능 | 포그라운드에서만 완전 노출 |
| 런타임 권한 | BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT | Bluetooth 권한 (자동) |
| GATT 서버 | 직접 응답 제어 가능 | CBPeripheralManager 위임 |

---

## 8. 상태 머신

```
IDLE → SCANNING ⟷ ADVERTISING
         │
     DISCOVERED
         │
     CONNECTING
         │
     EXCHANGING
         │
   AWAITING_CONFIRM
         │
     COMPLETED
         │
       ERROR
```

`BLEState` enum 정의: `src/constants/ble.ts`
