import React, { Component } from 'react';
import crcLib from 'react-native-crc'

// 命令字
const APP_COMMAND = {
    SEAL: 'FA',
    UPLOAD: 'F1',
    FREQUENCY: 'FC'
};
// 回复
const APP_RESPONSE = {
    SEAL: 'F0',
    UPLOAD: 'A2',
    FREQUENCY: 'BA'
};
// 版本
const APP_VERSION = {
    SEAL: '01',
    UPLOAD: '01',
    FREQUENCY: '01'
};
// 类型
const APP_TYPE = {
    SEAL: 'SEAL',
    UPLOAD: 'UPLOAD',
    FREQUENCY: 'FREQUENCY'
};
class Command extends React.Component {

    // 盖章
    seal() {

        let version = this.getCommand(APP_VERSION.SEAL)
        let seal_cmd = this.getCommand(APP_COMMAND.SEAL)
        let seal_res = this.getCommand(APP_RESPONSE.SEAL)
        let content = this.getContent(APP_TYPE.SEAL)

        return this.create_command(version, seal_cmd, seal_res, content)
    }

    // 上报数据
    upload(key) {

        let version = this.getCommand(APP_VERSION.UPLOAD)
        let cmd = this.getCommand(APP_COMMAND.UPLOAD)
        let res = this.getCommand(APP_RESPONSE.UPLOAD)
        let content = crcLib.strToHex(key)

        return this.create_command(version, cmd, res, content)

    }

    // 盖章次数
    frequency() {

        let version = this.getCommand(APP_VERSION.UPLOAD)
        let cmd = this.getCommand(APP_COMMAND.FREQUENCY)
        let res = this.getCommand(APP_RESPONSE.FREQUENCY)
        let content = this.getContent(APP_TYPE.FREQUENCY)

        return this.create_command(version, cmd, res, content)

    }

    create_command (version, cmd, res, content = []) {

        let contentArr = [version, cmd, res, ...content]
        let length = this.getLength(contentArr)
        let sumArray = [length, ...contentArr]

        let sum = this.calc(sumArray)

        let crcArr = this.getCRC(sum)

        let array = [...sumArray, ...crcArr]

        return this.addHeadAndFoot(array)
    }

    getCommand(cmd = '') {
        let result = parseInt(cmd, 16);
        return result
    }

    // 计算和
    calc(arr = []) {
        let sum = 0;
        arr.map((item) => {
            sum += item;
        });
        let hexStr = sum.toString(16);
        if (hexStr.length % 2 === 1) {
            hexStr = '0' + hexStr
        }
        return hexStr
    }

    // 数据总长度
    getLength(arr = []) {
        let len = arr.length + 3;
        return len
    }

    // 数据内容
    getContent (res) {
        let contentArr = []
        switch (res) {
            case APP_TYPE.SEAL:
                console.log("APP_TYPE.SEAL")
                contentArr = this.getRandom(2)
                break;
            case APP_TYPE.UPLOAD:
                console.log("APP_TYPE.UPLOAD")
                contentArr = this.getRandom(8)
                break;
            case APP_TYPE.FREQUENCY:
                console.log("APP_TYPE.FREQUENCY")
                contentArr = this.getRandom(2)
                break;
        }
        return contentArr
    }

    // 生成Content
    getRandom (count = 0) {
        let array = []
        for (var i=0; i<count; i++) {
            let num = parseInt(255*Math.random())
            array.push(i)
        }
        return array;
    }

    // 校验CRC
    getCRC(str = '') {

        let crc = crcLib.crc16(str)
        let crcArr = crcLib.strToHex(crc);

        return crcArr
    }

    // 帧头 帧尾
    addHeadAndFoot(arr = []) {
        let head = 0x56
        let foot = 0x58
        return [head, ...arr, foot]
    }
}

module.exports = new Command();