const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib')
const blockchainInfo = require('blockchain.info')
const wif = require('wif')
const crypto = require('crypto')
const PouchDB = require('pouchdb')

const constants = {
  child_path: "m/44'/0'/0'/0/0",
  wallet_name: 'a wallet'
}

const db = new PouchDB('my_db')

class BtcWallet {
  constructor ({ name, testnet = false, networkName } = {}) {
    this.name = name || constants.wallet_name
    this.testnet = testnet
    this.addresses = []

    this._blockexplorer = this.testnet ? blockchainInfo.blockexplorer.usingNetwork(3) : blockchainInfo.blockexplorer
    this._pushtx = this.testnet ? blockchainInfo.pushtx.usingNetwork(3).pushtx : blockchainInfo.pushtx
    this._info = {}

    if (networkName) this._network = bitcoin.networks[networkName]
    if (testnet) this._network = bitcoin.networks.testnet
  }

  _getPubAddress (node, network) {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address
  }

  _getPrivAddress (node) {
    return this._anyWIFtoTestnetWIF(node.toWIF())
  }

  _anyWIFtoTestnetWIF (aWIF) {
    let obj = wif.decode(aWIF)
    return wif.encode(bitcoin.networks.testnet.wif, obj.privateKey, obj.compressed)
  }

  _errMessage (msg, err) {
    return msg + ': ' + err.toString()
  }

  _createTransaction ({ fromAddr, toAddr, amount, wif, fee }) {
    return this.info({address: fromAddr}).then((info) => {
      try {
        const txb = new bitcoin.TransactionBuilder(this._network)

        let total = 0
        for (let utx of info.utxos) {
          txb.addInput(utx.tx_hash_big_endian, utx.tx_output_n)
          total += utx.value
        }

        txb.addOutput(toAddr, amount)

        const change = total - (amount + fee)
        if (change) txb.addOutput(fromAddr, change)

        info.utxos.forEach((v, i) => {
          txb.sign(i, bitcoin.ECPair.fromWIF(wif, this._network))
        })
        return txb.build().toHex()
      } catch (err) {
        throw new Error(this._errMessage('bad implementation', err))
      }
    }).catch((err) => {
      throw new Error(this._errMessage('create transaction', err))
    })
  }

  _broadcastTransaction ({ tx }) {
    return this._pushtx(tx).catch((err) => {
      throw new Error(this._errMessage('broadcast transaction', err))
    })
  }

  encrypt (value, password) {
    const cipher = crypto.createCipher('aes192', password)
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  decrypt (value, password) {
    const decipher = crypto.createDecipher('aes192', password)
    let decrypted = decipher.update(value, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  saveAddresses (id, pub, wif) {
    return db.get(id).then((doc) => {
      return db.put({ // update
        _id: id,
        _rev: doc._rev,
        pub: pub,
        wif: wif
      })
    }).catch((err) => {
      if (err.status === 404) {
        return db.put({ // insert
          _id: id,
          pub: pub,
          wif: wif
        }).catch((err) => {
          throw new Error(this._errMessage('insert address', err))
        })
      }
      throw new Error(this._errMessage('save address', err))
    })
  }

  deleteAddresses (id) {
    db.get(id).then((doc) => {
      return db.remove(doc)
    }).catch((err) => {
      throw new Error(this._errMessage('save address error', err))
    })
  }

  getSavedAddress (id) {
    return db.get(id).catch((err) => {
      throw new Error(this._errMessage('get save address error', err))
    })
  }

  info ({ address } = {}) {
    if (!address) {
      return Promise.reject(new Error('info: address must be specified'))
    }

    return this._blockexplorer.getUnspentOutputs(address).then((resp) => {
      this._info.utxos = resp.unspent_outputs
      this._info.coins = this._info.utxos.reduce((s, c) => s + c.value, 0) / 100000000
      return this._info
    }).catch((err) => {
      throw new Error(this._errMessage('blockchain info', err))
    })
  }

  sendCoins ({ fromAddr, wif, toAddr, amount, fee = null } = {}) {
    if (!fromAddr || !toAddr || !amount || !wif || fee == null) {
      return Promise.reject(new Error('transaction: fromAddr, toAddr, wif, amount and fee must be specified'))
    }

    return this._createTransaction({ fromAddr, wif, toAddr, amount, fee }).then((tx) => {
      return this._broadcastTransaction({ tx })
    }).catch((err) => {
      throw new Error(this._errMessage('send coins', err))
    })
  }

  create ({ mnemonic, childPath } = {}) {
    try {
      !mnemonic && (mnemonic = bip39.generateMnemonic())
      !childPath && (childPath = constants.child_path)

      const seed = bip39.mnemonicToSeed(mnemonic)
      const root = bip32.fromSeed(seed)
      const child = root.derivePath(childPath)

      const address = {
        pub: this._getPubAddress(child, this._network),
        wif: this._getPrivAddress(child)
      }
      this.addresses.push(address)

      return { mnemonic, address }
    } catch (err) {
      throw new Error(this._errMessage('create wallet', err))
    }
  }
}

module.exports = BtcWallet
