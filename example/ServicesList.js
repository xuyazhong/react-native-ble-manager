import React, { Component } from 'react';
import {StyleSheet, Text, View, TouchableHighlight, TouchableOpacity, Alert, Button, NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, ListView, ScrollView, AppState, Dimensions } from 'react-native';
import BLEKit from 'react-native-ble-manager';
const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
const readCharacterUUID = "FFF1"; // 读取
const CharacterUUID = "2A06"; //写入
const notiCharacterUUID = "CAB2"; //通知

export default class ServicesList extends Component {
  constructor(){
    super()

    this.state = {
      peripherals: new Map(),
      selectedId: '',
      selectedName: '',
      characteristicArr: [],
      selectedCharacteristic: null,
        isNotify: false,
        receiveString: ''
    }
  }

  componentDidMount() {

    BLEKit.ble_DiscoverPeripheralCallback((peripheral) => {
      // console.log("###receive =>", peripheral);
        var oldPeripherals = this.state.peripherals;
        if (!oldPeripherals.has(peripheral.id)){
            // console.log('Got ble peripheral', peripheral);
            oldPeripherals.set(peripheral.id, peripheral);
            this.setState({
                peripherals: oldPeripherals
            })
        } else {

        }
    });

    BLEKit.ble_AppState((callback) => {
        console.log("ble_AppState =>", callback)
    })

    BLEKit.ble_NotifyForCharacteristicCallback((result) => {
        console.log('订阅收到数据 =>', result);
        this.setState({
            receiveString: result
        })
        Alert.alert("收到数据 =>", result);
    });
  }

  actionStopNotifi () {
      console.log('取消订阅');
      BLEKit.ble_stopNotification(this.state.selectedId, this.state.selectedCharacteristic).then((succ) => {
          console.log(succ)
          this.setState({
              isNotify: false,
              selectedCharacteristic: null,
              receiveString: ''
          })
      }, (fail) => {
          console.log(fail)
      })
  }

  componentWillUnmount() {
    BLEKit.handleRemove()
  }

  //连接蓝牙
  connect(peripheral) {
      // Alert.alert("ble id =>" + peripheral.id)
      BLEKit.ble_connect(peripheral.id).then((peripheralInfo) => {
      console.log("peripheralInfo =>", peripheralInfo)
      this.setState({
          selectedId: peripheral.id,
          selectedName: peripheral.name,
          characteristicArr: peripheralInfo.characteristics
      })
    }, (failure) => {
      console.log('failure =>', failure)
    });
  }

  // 写数据
  actionWrite(characteristic) {
    // BLEKit.actionRetrieveConnected().then((succ)=> {
    //     console.log("取回成功 =>", succ)
    // }, (fail) => {
    //   console.log("取回失败 =>", fail)
    // })

    // let data = "WXY";
    let data = "56F1FC0BFC0BFC0AA658";

    BLEKit.ble_write(data, this.state.selectedId, characteristic).then((success) => {
        console.log("--------写入成功");
    }, (failure) => {
        Alert.alert("写入失败" + failure)
        console.log("--------写入失败");
    })
  }

    // 写数据
    actionWriteWithoutResponse(characteristic) {
        // BLEKit.actionRetrieveConnected().then((succ)=> {
        //     console.log("取回成功 =>", succ)
        // }, (fail) => {
        //     console.log("取回失败 =>", fail)
        // })

        // let data = "WXY";
        let data = "56F1FC0BFC0BFC0AA658";

        BLEKit.ble_writeWithoutResponse(data, this.state.selectedId, characteristic).then((success) => {
            console.log("--------写入成功");
            Alert.alert("写入成功 =>", data);
        }, (failure) => {
            Alert.alert("写入失败" + failure)
            console.log("--------写入失败");
        })
    }

  // 读取数据
  actionRead(characteristic) {
      BLEKit.ble_read(this.state.selectedId, characteristic).then((success) => {
          console.log("--------读取成功 =>", success);
          Alert.alert("--------读取成功 =>", success);
      }, (failure) => {
          console.log("--------读取失败 =>", failure);
          Alert.alert("--------读取失败 =>", failure);
      })
  }

  // 订阅
  actionSubscription (characteristic) {
      this.setState({
          selectedCharacteristic: characteristic
      }, () => {
          BLEKit.ble_startNotification(this.state.selectedId, characteristic).then((success) => {
              console.log("--------订阅成功");
              this.setState({
                  isNotify: true
              })
          }, (failure) => {
              console.log("--------订阅失败");
          })
      })
  }

  renderBtns(characteristic) {
      let propertieArray = []
      if (Platform.OS === 'android') {
          propertieArray = Object.values(characteristic.properties)
      }
      if (Platform.OS === 'ios') {
          propertieArray = characteristic.properties
      }
      let view = [];
      propertieArray.map((item, index) => {
          view.push(
              <TouchableHighlight key={index} onPress={() => {
                  switch (item) {
                      case "Read":
                          this.actionRead(characteristic)
                          break
                      case "Write":
                          this.actionWrite(characteristic)
                          break
                      case "Notify":
                          if (this.state.isNotify) {
                              this.actionStopNotifi()
                          } else {
                              this.actionSubscription(characteristic)
                          }
                          break
                      case "WriteWithoutResponse":
                          this.actionWriteWithoutResponse(characteristic)
                          break
                  }
              }}>
                  <Text style={styles.charCell}>{this.getStatus(item)}</Text>
              </TouchableHighlight>
          )

      });
      return view;
  }

  getStatus(item) {
      let result = ''
      switch (item) {
          case "Read":
              result = '读'
              break
          case "Write":
              result = '写(有回复)'
              break
          case "Notify":
              if (this.state.isNotify) {
                  result = '订阅中'
              } else {
                  result = '订阅'
              }
              break
          case "WriteWithoutResponse":
              result = '写'
              break
      }
      return result
  }

  renderCharacterRow = (item) => (
    <View>
        <View style={[styles.row, {backgroundColor: '#fff'}]}>
            <View>
                <Text style={styles.charCell}>characteristic: {item.characteristic}</Text>
                <Text style={styles.charCell}>service: {item.service}</Text>
            </View>
            {this.renderBtns(item)}
        </View>
    </View>
  );
  
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
                if (Platform.OS === 'android') {
                    BLEKit.ble_enableBluttooth().then((succ) => {
                        Alert.alert("ble enable")
                    }, (fail) => {
                        Alert.alert("ble not enable")
                    })
                }
                if (Platform.OS === 'ios') {
                    // console.log("ios ble State => ", BLEKit.ble_State());
                }

            }}>
              <View style={[styles.BtnStyle]}>
                <Text>scan</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.navigationItem]}>
            <TouchableOpacity onPress={() => {
              BLEKit.ble_disconnect(this.state.selectedId)
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
                            <TouchableHighlight onPress={() => this.connect(item)}>
                                <View style={[styles.row, {backgroundColor: color}]}>
                                    <Text style={styles.charCell}>{item.name}</Text>
                                    <Text style={styles.charCell}>{item.id}</Text>
                                </View>
                            </TouchableHighlight>
                        );
                    }}
                /> :
                <View>
                    <View style={[styles.row, {backgroundColor: '#fff'}]}>
                        <Text style={styles.charCell}>UUID:{this.state.selectedId}</Text>
                        <Text style={styles.charCell}>Name:{this.state.selectedName}</Text>
                    </View>
                    {this.state.characteristicArr.length > 0 &&
                    <View>
                        <ListView
                            enableEmptySections={true}
                            dataSource={ds.cloneWithRows(this.state.characteristicArr)}
                            renderRow={(item) => this.renderCharacterRow(item)}
                        />
                        {this.state.isNotify && <Text>收到的数据 : {this.state.receiveString}</Text>}
                    </View>
                    }
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
  },
  charCell: {
      fontSize: 12,
      textAlign: 'center',
      color: '#333333',
      padding: 10
  }
});
