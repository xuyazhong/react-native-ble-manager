/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
  NetInfo
} from 'react-native';
import ServicesList from './ServicesList'

export default class App extends Component {
  render() {
    return <ServicesList />
  }
}