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

            BleManager.start({showAlert: false});

            //监听
            // AppState.addEventListener('change', this.handleAppStateChange);
            this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
            this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
            this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
            this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );

            let bleCallback = (result) => {}
            this.state = {
                // 蓝牙设备列表回调
                DiscoverCallback: bleCallback(),
                // 通知回调
                NotifyCallback: bleCallback()
            }
        }
        return BLEKit.instance;
    }

    // 监听状态变化
    handleAppStateChange(nextAppState) {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground!')
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
                console.log('Connected peripherals: ' + peripheralsArray.length);
            });
        }
        this.setState({appState: nextAppState});
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
        BleManager.scan([], 3, true).then((results) => {
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
        this.state.NotifyCallback(bytesToString(data.value));
    }

    // 接收通知回调
    ble_NotifyForCharacteristicCallback(callback) {
        this.state.NotifyCallback = callback;
    }

    //连接蓝牙
    ble_connect(peripheralId) {
        return new Promise((success, failure) => {
            BleManager.connect(peripheralId).then(() => {
                console.log('Connected to ' + peripheralId);
                BleManager.retrieveServices(peripheralId).then((peripheralInfo) => {
                    console.log('retrieveServices =>', peripheralInfo)
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
        return new Promise((success, failure) => {
            let propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('WriteWithoutResponse')) {
                BleManager.writeWithoutResponse(selectedId, selectedCharacteristic.service, selectedCharacteristic.characteristic, stringToBytes(dataValue)).then((success) => {
                    success('写入成功')
                }, (failure) => {
                    failure('写入失败 =>' + failure)
                })
            } else {
                failure('无权限')
            }
        });
    }

    // 写入
    ble_write(dataValue, selectedId, selectedCharacteristic) {
        console.log("dataValue =>", dataValue)
        console.log("selectedId =>", selectedId)
        console.log("selectedCharacteristic =>", selectedCharacteristic)
        return new Promise((succ, fail) => {
            let propertieArray = this.getPropertieArray(selectedCharacteristic);
            if (propertieArray.includes('Write')) {
                BleManager.write(selectedId, selectedCharacteristic.service, selectedCharacteristic.characteristic, stringToBytes(dataValue)).then((success) => {
                    succ('写入成功')
                }, (failure) => {
                    fail('写入失败 =>' + failure)
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