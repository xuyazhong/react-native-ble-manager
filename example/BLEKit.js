import React, { Component } from 'react';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, ListView, ScrollView, AppState, Dimensions } from 'react-native';

import BleManager from 'react-native-ble-manager';
import { stringToBytes, bytesToString } from 'convert-string'

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const CharacteristicUUID = "2A06" //写入
// const CharacteristicUUID = "CAB2"  //订阅
// const CharacteristicUUID = "FFF1"  //读取

let instance = null;
var name = '';
let scanning = false;
var DiscoverCallback = (result) => {
    console.log("result => ", result)
}

var NotifyCallback = (result) => {
    console.log("result => ", result)
}

export default class BLEKit {
    constructor() {
        if(!instance){
            instance = this;

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

        }
        return instance;
    }

    /***
     * 类方法
     */
    static ShareInstance(){
        let singleton = new BLEKit();
        return singleton;
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
        // let peripherals = this.peripherals;
        // let peripheral = peripherals.get(data.peripheral);
        // if (peripheral) {
        //     peripheral.connected = false;
        //     peripherals.set(peripheral.id, peripheral);
        //     this.setState({peripherals});
        // }
        console.log('Disconnected from ' + data.peripheral);
    }

    // 监听停止扫描
    handleStopScan() {
        console.log('Scan is stopped');
        this.scanning = false;
    }

    // 删除绑定
    handleRemove() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    //开始扫描蓝牙设备
    startScan() {
        console.log('begin scan')
        if (!this.scanning) {
            this.peripherals = new Map();
            BleManager.scan([], 3, true).then((results) => {
                console.log('Scanning...');
                this.scanning = true;
            });
        }
    }

    //断开连接
    actionDiscount(selectedId) {
        BleManager.disconnect(selectedId);
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
        this.DiscoverCallback(peripheral)
    }

    //扫描结果回调
    DiscoverPeripheralCallback(callback) {
        this.DiscoverCallback = callback;
    }

    // 监听Characteristic值变化
    // 订阅接收到的数据
    handleUpdateValueForCharacteristic(data) {
        this.NotifyCallback(bytesToString(data.value));
    }

    // 接收通知回调
    NotifyForCharacteristicCallback(callback) {
        this.NotifyCallback = callback;
    }

    //连接蓝牙
    actionConnect(peripheral) {
        return new Promise((success, failure) => {
            if (peripheral){
                if (peripheral.connected){
                    failure('do not Connection again');
                } else {
                    BleManager.connect(peripheral.id).then(() => {
                        console.log('Connected to ' + peripheral.id);
                        BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
                            // console.log('peripheralInfo =>', peripheralInfo);
                            // console.log('characteristics =>', peripheralInfo.characteristics);
                            var characteristic;
                            peripheralInfo.characteristics.map((item) => {
                                console.log("item =>", item)
                                if (item.characteristic.toUpperCase() === CharacteristicUUID.toUpperCase()) {
                                    characteristic = item;
                                }
                            })
                            characteristic ? success(characteristic) : failure('no characteristics')
                        })
                    }).catch((error) => {
                        failure('Connection error' + error)
                    });
                }
            }
        });
    }

    // 写入蓝牙
    actionWriteWithoutResponse(dataValue, selectedId, selectedCharacteristic) {
        return new Promise((success, failure) => {
            var propertieArray = this.getPropertieArray(selectedCharacteristic);
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
    actionWrite(dataValue, selectedId, selectedCharacteristic) {
        return new Promise((succ, fail) => {
            var propertieArray = this.getPropertieArray(selectedCharacteristic);
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
    actionStartNotification(peripheralId, selectedCharacteristic) {
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

    actionStopNotification(peripheralId, selectedCharacteristic) {
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
    actionRead(peripheralId, selectedCharacteristic) {
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
}
