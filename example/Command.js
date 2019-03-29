'use strict';

class BLECommand {

    // 盖章
    static ble_command_seal() {
        let n1 = 8   // 0x08
        let n2 = 16  // 0x10
        let n3 = 250 // 0xFA
        let n4 = 240 // 0xF0

        let n5 = 252 // 0xFC
        let n6 = 11 // 0x0B

        return getCommand([n1, n2, n3, n4, n5, n6])
    }

    // 上报数据
    static ble_command_upload() {
        // 0B
        // 10
        // F1
        // A2
        // FC0BFC0BFC
        // 0AA6

        let n1 = 8   // 0x08
        let n2 = 16  // 0x10
        let n3 = 250 // 0xFA
        let n4 = 240 // 0xF0

        let n5 = 252 // 0xFC
        let n6 = 11 // 0x0B

        return getCommand([n1, n2, n3, n4, n5, n6])
    }

    // 盖章次数
    static ble_command_frequency() {
        // 08
        // 10
        // FC
        // BA
        // FFFF
        // FD56


        let n1 = 8   // 0x08
        let n2 = 16  // 0x10
        let n3 = 250 // 0xFA
        let n4 = 240 // 0xF0

        let n5 = 252 // 0xFC
        let n6 = 11 // 0x0B

        return getCommand([n1, n2, n3, n4, n5, n6])
    }

    static getCommand(arr = []) {
        let len = arr.length + 1;
        let newArray = [len, ...arr];
        let sum = 0;
        newArray.map((item) => {
            sum += item;
        });
        let hexStr = sum.toString(16);
        if (hexStr.length % 2 === 1) {
            hexStr = '0' + hexStr
        }
        let a1 = crcLib.crc16(hexStr)
        let a2 = crcLib.strToHex(a1);
    }

    static addHeadAndFoot(arr = []) {
        let head = 0x56
        let foot = 0x58
        return [head, ...arr, foot]
    }
}

module.exports = new BLECommand();