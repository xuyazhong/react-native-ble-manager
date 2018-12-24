import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  TouchableOpacity,
  NativeAppEventEmitter,
  Button,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  ListView,
  ScrollView,
  AppState,
  Dimensions,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { stringToBytes } from 'convert-string'

const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class ServicesList extends Component {
  constructor(){
    super()

    this.state = {
      scanning:false,
      peripherals: new Map(),
      appState: '',
      selectedId: '',
      selectedName: '',
      peripheralArray: [],
      dataArray: ds.cloneWithRows([])
    }

    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  actionScan = () => {
    this.startScan()
  }

  actionDiscount = () => {
    BleManager.disconnect(this.state.selectedId);
    this.setState({
      selectedId: '',
      selectedName: ''
    })
  }

  componentDidMount() {

    AppState.addEventListener('change', this.handleAppStateChange);

    BleManager.start({showAlert: false});

    this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
    this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
    this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
    this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
            if (result) {
              console.log("Permission is OK");
            } else {
              PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                  console.log("User accept");
                } else {
                  console.log("User refuse");
                }
              });
            }
      });
    }

  }

  handleAppStateChange(nextAppState) {
    if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!')
      BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
        console.log('Connected peripherals: ' + peripheralsArray.length);
      });
    }
    this.setState({appState: nextAppState});
  }

  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
    this.handlerUpdate.remove();
  }

  handleDisconnectedPeripheral(data) {
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals});
    }
    console.log('Disconnected from ' + data.peripheral);
  }

  handleUpdateValueForCharacteristic(data) {
    console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
  }

  handleStopScan() {
    console.log('Scan is stopped');
    this.setState({ scanning: false });
  }

  startScan() {
    if (!this.state.scanning) {
      this.setState({peripherals: new Map()});
      BleManager.scan([], 3, true).then((results) => {
        console.log('Scanning...');
        this.setState({scanning:true});
      });
    }
  }

  retrieveConnected(){
    BleManager.getConnectedPeripherals([]).then((results) => {
      if (results.length == 0) {
        console.log('No connected peripherals')
      }
      console.log(results);
      var peripherals = this.state.peripherals;
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        this.setState({ peripherals });
      }
    });
  }

  handleDiscoverPeripheral(peripheral){
    var peripherals = this.state.peripherals;
    if (!peripherals.has(peripheral.id)){
      console.log('Got ble peripheral', peripheral);
      peripherals.set(peripheral.id, peripheral);
      this.setState({ peripherals })
    }
  }

  test(peripheral) {
    if (peripheral){
      if (peripheral.connected){
        
      } else {
        BleManager.connect(peripheral.id).then(() => {
          let peripherals = this.state.peripherals;
          let p = peripherals.get(peripheral.id);
          if (p) {
            p.connected = true;
            peripherals.set(peripheral.id, p);
            this.setState({peripherals});
            this.setState({
              selectedId: peripheral.id,
              selectedName: peripheral.name
            })
          }
          console.log('Connected to ' + peripheral.id);
          BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
            console.log('peripheralInfo =>', peripheralInfo);
            console.log('characteristics =>', peripheralInfo.characteristics);
            this.setState({
              peripheralArray: peripheralInfo.characteristics,
              dataArray: ds.cloneWithRows(peripheralInfo.characteristics)
            })
          })
        }).catch((error) => {
          console.log('Connection error', error);
        });
      }
    }
  }

  
  render() {
    var buffData = new Buffer('0x00110011', 'hex');
    const list = Array.from(this.state.peripherals.values());
    const dataSource = ds.cloneWithRows(list);

    return (
      <View style={styles.container}>
        <View style={styles.navigationStyle}>
          <View style={[styles.navigationItem]}>
            <TouchableOpacity onPress={this.actionScan}>
              <View style={[styles.BtnStyle]}>
                <Text>scan</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.navigationItem]}>
            <TouchableOpacity onPress={this.actionDiscount}>
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
                  <TouchableHighlight onPress={() => this.test(item) }>
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
              <ListView 
                enableEmptySections={true}
                dataSource={this.state.dataArray}
                renderRow={(item) => {
                  // const color = item.connected ? 'green' : '#fff';
                  return (
                    <TouchableHighlight onPress={() => {
                      console.log('item =>[', item.properties , ']', item)
                      // Notify、Read、Write、WriteWithoutResponse
                      // let dataValue = "Hello"
                      let dataValue = "CHANNEL=ios&company=beecredit&DEVICENUMBER=0001&timestamp=1530031691&TOKEN=1234&sign=661d3dfd2f2d6cec0abadd8468458e15"
                      // let data = stringToBytes(dataValue)
                      console.log('write origin:', dataValue)
                      console.log('write new:', data)
                      let data = stringToBytes(dataValue)
                      console.log('properties type =>', typeof(item.properties))
                      var propertieArray = item.properties
                      if (Platform.OS === 'android') {
                        console.log('android')
                        propertieArray = Object.values(item.properties)
                        // propertieArray = item.properties.()
                      }
                      console.log('propertieArray =>', propertieArray)
                      if (propertieArray.includes('Write')) {
                        console.log('wirte')
                        BleManager.write(this.state.selectedId, item.service, item.characteristic, data).then((success) => {
                          console.log('写入成功 =>', success)
                        }, (failure) => {
                          console.log('写入失败 =>', failure)
                        })
                      }
                      if (propertieArray.includes('WriteWithoutResponse')) {
                        console.log('WriteWithoutResponse')
                        BleManager.writeWithoutResponse(this.state.selectedId, item.service, item.characteristic, data).then((success) => {
                          console.log('写入成功 =>', success)
                        }, (failure) => {
                          console.log('写入失败 =>', failure)
                        })
                      }
                    }}>
                      <View style={[styles.row, {backgroundColor: '#fff'}]}>
                        <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>characteristic: {item.characteristic}</Text>
                        <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>service: {item.service}</Text>
                        <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>properties: {Object.values(item.properties)}</Text>
                      </View>
                    </TouchableHighlight>
                  );
                }}
              />
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
