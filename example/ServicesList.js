import React, { Component } from 'react';
import {StyleSheet, Text, View, TouchableHighlight, TouchableOpacity, Alert, Button, NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, ListView, ScrollView, AppState, Dimensions } from 'react-native';
import BLEKit from 'react-native-ble-manager';
const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
const CharacterUUID = "2A06"; //写入

export default class ServicesList extends Component {
  constructor(){
    super()

    this.state = {
      peripherals: new Map(),
      selectedId: '',
      selectedName: '',
      selectedCharacteristic: null
    }
  }

  componentDidMount() {

    BLEKit.ble_DiscoverPeripheralCallback((peripheral) => {
      console.log("###receive =>", peripheral);
        var oldPeripherals = this.state.peripherals;
        if (!oldPeripherals.has(peripheral.id)){
            console.log('Got ble peripheral', peripheral);
            oldPeripherals.set(peripheral.id, peripheral);
            this.setState({
                peripherals: oldPeripherals
            })
        } else {

        }
    });

    BLEKit.ble_NotifyForCharacteristicCallback((result) => {
      console.log('订阅收到数据 =>', result);
      console.log('取消订阅');
        // actionStopNotification
        BLEKit.actionStopNotification(this.state.selectedId, this.state.selectedCharacteristic).then((succ) => {
          console.log(succ)
        }, (fail) => {
          console.log(fail)
        })
    });

  }

  componentWillUnmount() {
    BLEKit.handleRemove()
  }

  //连接蓝牙
  connect(peripheral) {
      Alert.alert("ble id =>" + peripheral.id)
      BLEKit.ble_connect(peripheral.id).then((peripheralInfo) => {
      console.log("peripheralInfo =>", peripheralInfo)
        peripheralInfo.characteristics.map((item) => {
            console.log("item =>", item)
            console.log("CharacterUUID =>", CharacterUUID)
            console.log("characteristic=>", item.characteristic)
            if (item.characteristic.toUpperCase() === CharacterUUID) {
                // characteristic = item;
                this.setState({
                    selectedId: peripheral.id,
                    selectedName: peripheral.name,
                    selectedCharacteristic: item
                })
            }
        })
    }, (failure) => {
      console.log('failure =>', failure)
    });
  }

  // 写数据
  actionWrite() {

    let data = "HelloWrold";

    BLEKit.ble_write(data, this.state.selectedId, this.state.selectedCharacteristic).then((success) => {
        console.log("--------写入成功");
    }, (failure) => {
        Alert.alert("写入失败" + failure)
        console.log("--------写入失败");
    })
  }

  // 读取数据
  actionRead() {
      BLEKit.ble_read(this.state.selectedId, this.state.selectedCharacteristic).then((success) => {
          console.log("--------写入成功");
      }, (failure) => {
          console.log("--------写入失败");
      })
  }

  // 订阅
  actionSubscription () {
      BLEKit.ble_startNotification(this.state.selectedId, this.state.selectedCharacteristic).then((success) => {
        console.log("--------订阅成功");
      }, (failure) => {
        console.log("--------订阅失败");
      })
  }
  
  render() {
    const list = Array.from(this.state.peripherals.values());
    const dataSource = ds.cloneWithRows(list);

    return (
      <View style={styles.container}>
        <View style={styles.navigationStyle}>
          <View style={[styles.navigationItem]}>
            <TouchableOpacity onPress={() => {
                this.setState({peripherals: new Map()});
                BLEKit.ble_scan()
            }}>
              <View style={[styles.BtnStyle]}>
                <Text>scan</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.navigationItem]}>
            <TouchableOpacity onPress={() => {
              BLEKit.actionDiscount(this.state.selectedId)
                this.setState({
                    selectedId: ''
                })
            }}>
              <View style={[styles.BtnStyle]}>
                <Text>discount</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.scroll}>
          {(list.length == 0) &&
            <View style={{flex:1, margin: 20}}>
              <Text style={{textAlign: 'center'}}>No peripherals</Text>
            </View>
          }
          {(this.state.selectedId.length === 0) ?
            <ListView
              enableEmptySections={true}
              dataSource={dataSource}
              renderRow={(item) => {
                const color = item.connected ? 'green' : '#fff';
                return (
                  <TouchableHighlight onPress={() => this.connect(item) }>
                    <View style={[styles.row, {backgroundColor: color}]}>
                      <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
                      <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>{item.id}</Text>
                    </View>
                  </TouchableHighlight>
                );
              }}
            /> :
            <View style={[styles.row, {backgroundColor: '#fff'}]}>
              <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>selected Id:{this.state.selectedId}</Text>
              <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>selected Name{this.state.selectedName}</Text>
              <TouchableHighlight onPress={() => {
                this.actionWrite()
              }}>
                <View style={[styles.row, {backgroundColor: '#fff'}]}>
                  <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>写入</Text>
                  {
                    this.state.selectedCharacteristic &&
                        <View>
                          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>characteristic: {this.state.selectedCharacteristic.characteristic}</Text>
                          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>service: {this.state.selectedCharacteristic.service}</Text>
                          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>properties: {Object.values(this.state.selectedCharacteristic.properties)}</Text>
                        </View>
                  }
                </View>
              </TouchableHighlight>
            </View>
          }
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  },
  row: {
    margin: 10
  },
  navigationStyle: {
    flexDirection: 'row', 
    height: 50, 
    width: Dimensions.width, 
    marginTop: 20
  },
  navigationItem: {
    flex: 1, 
    width: Dimensions.width/2
  },
  BtnStyle: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 20,
    fontWeight: 'bold'
  }
});
