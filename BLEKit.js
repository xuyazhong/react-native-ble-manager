'use strict';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, ListView, ScrollView, AppState, Dimensions } from 'react-native';
import BleManager from './BleManager';
import { stringToBytes, bytesToString } from 'convert-string'

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BLEKit {
    constructor() {
        if (!BLEKit.instance) {
            BLEKit.instance = this;
            //绑定
            this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
            this.handleStopScan = this.handleStopScan.bind(this);
            this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
            this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
            this.handleAppStateChange = this.handleAppStateChange.bind(this);
            this.handleBleStateChange = this.handleBleStateChange.bind(this);

            BleManager.start({showAlert: false});

            //监听
            AppState.addEventListener('change', this.handleAppStateChange);
            this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
            this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
            this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
            this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );
            this.hanlderUpdateState = bleManagerEmitter.addListener('BleManagerDidUpdateState', this.handleBleStateChange);

            let bleCallback = (result) => {}
            this.state = {
                appStateCallback:  (result) => {},
                // 蓝牙设备列表回调
                DiscoverCallback: bleCallback(),
                // 通知回调
                NotifyCallback: bleCallback(),
                // 蓝牙状态变化
                appStateChangeCallback: bleCallback(),
                // 蓝牙是否开启
                appEnableBluetooth: (result) => {},
            }
        }
        return BLEKit.instance;
    }

    // 监听状态变化
    handleAppStateChange = (nextAppState) => {
        this.state.appStateCallback(nextAppState)
    }

    // 监听状态变化回调
    ble_AppState(callback) {
        this.state.appStateCallback = callback;
    }

    // 开始监听
    ble_checkState() {
        return BleManager.checkState();
    }

    // 监听 蓝牙开启/关闭状态
    handleBleStateChange = (result) => {
        this.state.appEnableBluetooth(result)
    }

    // 回调
    ble_State(callback) {
        this.state.appEnableBluetooth = callback
    }

    // 只支持Android
    ble_enableBluttooth() {
        return BleManager.enableBluetooth()
    }

    // 监听断开连接
    handleDisconnectedPeripheral(data) {
        console.log('Disconnected from ' + data.peripheral);
    }

    // 监听停止扫描
    handleStopScan() {
        console.log('Scan is stopped');
    }

    // 删除绑定
    handleRemove() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    //开始扫描蓝牙设备
    ble_scan() {
        console.log('begin scan')
        BleManager.scan([], 10, true).then((results) => {
            console.log('Scanning...');
        });
    }

    //断开连接
    ble_disconnect(peripheralsId) {
        BleManager.disconnect(peripheralsId);
    }

    // 取回连接
    actionRetrieveConnected(){
        return new Promise((success) => {
            BleManager.getConnectedPeripherals([]).then((results) => {
                success(results)
            });
        });
    }

    //发现蓝牙设备
    handleDiscoverPeripheral(peripheral) {
        this.state.DiscoverCallback(peripheral)
    }

    //扫描结果回调
    ble_DiscoverPeripheralCallback(callback) {
        this.state.DiscoverCallback = callback;
    }

    // 监听Characteristic值变化
    // 订阅接收到的数据
    handleUpdateValueForCharacteristic(data) {
        this.state.NotifyCallback(data.value);
    }

    // 接收通知回调
    ble_NotifyForCharacteristicCallback(callback) {
        this.state.NotifyCallback = callback;
    }

    //连接蓝牙
    ble_connect(peripheralId) {
        return new Promise((success, failure) => {
            BleManager.connect(peripheralId).then(() => {
                BleManager.retrieveServices(peripheralId).then((peripheralInfo) => {
                    success(peripheralInfo)
                }, (reject) => {
                    failure("retrieveServices error" + reject)
                })
            }).catch((error) => {
                failure('Connection error' + error)
            });
        });
    }

    // 写入蓝牙
    ble_writeWithoutResponse(dataValue, selectedId, selectedCharacteristic) {
        console.log("dataValue =>", dataValue)
        console.log("selectedId =>", selectedId)
        console.log("selectedCharacteristic =>", selectedCharacteristic)
        return new Promise((success, fail) => {
            let propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('WriteWithoutResponse')) {
                BleManager.writeWithoutResponse(selectedId, selectedCharacteristic.service, selectedCharacteristic.characteristic, dataValue).then(() => {
                    success('写入成功')
                }).catch((error) => {
                    fail('写入失败')
                })
            } else {
                fail('无权限')
            }
        });
    }

    // 写入
    ble_write(dataValue, selectedId, selectedCharacteristic) {
        console.log("dataValue =>", dataValue)
        console.log("selectedId =>", selectedId)
        console.log("selectedCharacteristic =>", selectedCharacteristic)
        return new Promise((success, fail) => {
            let propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('Write')) {
                BleManager.write(selectedId, selectedCharacteristic.service, selectedCharacteristic.characteristic, dataValue).then(() => {
                    success('写入成功')
                }).catch((error) => {
                    fail('写入失败')
                })
            } else {
                fail('无权限')
            }
        });
    }

    // 订阅
    ble_startNotification(peripheralId, selectedCharacteristic) {
        return new Promise((succ, fail) => {
            var propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('Notify')) {
                BleManager.startNotification(peripheralId, selectedCharacteristic.service, selectedCharacteristic.characteristic).then((success) => {
                    succ('订阅成功')
                }, (failure) => {
                    fail('订阅失败 =>' + failure)
                });
            } else {
                fail('无权限')
            }
        });
    }

    // 取消订阅
    ble_stopNotification(peripheralId, selectedCharacteristic) {
        return new Promise((succ, fail) => {
            var propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('Notify')) {
                BleManager.stopNotification(peripheralId, selectedCharacteristic.service, selectedCharacteristic.characteristic).then((success) => {
                    succ('取消订阅成功')
                }, (failure) => {
                    fail('取消订阅失败 =>' + failure)
                });
            } else {
                fail('无权限')
            }
        });
    }

    // 读取
    ble_read(peripheralId, selectedCharacteristic) {
        return new Promise((succ, fail) => {
            var propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('Read')) {
                BleManager.read(peripheralId, selectedCharacteristic.service, selectedCharacteristic.characteristic).then((success) => {
                    succ(bytesToString(success))
                }, (failure) => {
                    fail('读取失败' + failure)
                });
            } else {
                fail('无权限')
            }
        });
    }

    getPropertieArray(selectedCharacteristic) {
        var propertieArray = selectedCharacteristic.properties
        if (Platform.OS === 'android') {
            propertieArray = Object.values(selectedCharacteristic.properties)
        }
        return propertieArray;
    }

    ble_readRSSI(peripheralId) {
        return BleManager.readRSSI();
    }

}

module.exports = new BLEKit();