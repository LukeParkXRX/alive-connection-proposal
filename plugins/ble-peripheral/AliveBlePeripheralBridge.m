/**
 * AliveBlePeripheralBridge — iOS ObjC 브릿지
 * Swift 모듈을 React Native에 노출합니다.
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AliveBlePeripheral, NSObject)

RCT_EXTERN_METHOD(
  startPeripheral:(NSString *)serviceUuid
  charUuid:(NSString *)charUuid
  userId:(NSString *)userId
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  stopPeripheral:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  isSupported:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

@end
