const BtcWallet = require('../lib/wallet')

const wallet = new BtcWallet({
  testnet: true
});

(async () => {
  try {
    const mnemonics = [
      'actress bus drop lion labor genre mirror disagree bundle advance car wisdom',
      'actress bus drop lion labor genre mirror disagree bundle advance bike wisdom'
    ]

    console.log('---------------------')
    console.log('STEP 1. Create addresses')
    mnemonics.forEach((mnemonic, i) => {
      console.log(`addr #${i}: `, wallet.create({ mnemonic }))
    })

    console.log('---------------------')
    console.log('STEP 2. Encrypt WIF')
    var encrypted = wallet.encrypt(wallet.addresses[0].wif, 'a password')
    console.log(`Encrypted WIF: `, encrypted)

    wallet.addresses[0].wif = encrypted
    console.log('Encripted WIF: ', wallet.addresses[0].wif)

    console.log('---------------------')
    console.log('STEP 3. Save addresses')

    console.log(await wallet.saveAddresses('my-address', wallet.addresses[0].pub, wallet.addresses[0].wif))
    console.log(await wallet.saveAddresses('to-address', wallet.addresses[1].pub, null))

    // console.log(wallet.saveAddresses('to-address', wallet.addresses[1].pub, null))

    console.log('---------------------')
    console.log('STEP 4. Check balance')
    for (let i = 0; i < wallet.addresses.length; i++) {
      const info = await wallet.info({ address: wallet.addresses[i].pub })
      console.log(`address ${wallet.addresses[i].pub}:\n`, info)
    }

    console.log('---------------------')
    console.log('STEP 5. Retrive addresses')
    var myaddress = await wallet.getSavedAddress('my-address')
    console.log(`My addresses:`, myaddress)
    var toaddress = await wallet.getSavedAddress('to-address')
    console.log(`To addresses:`, toaddress)

    console.log('---------------------')
    console.log('STEP 6. Decrypt WIF')
    myaddress.wif = wallet.decrypt(myaddress.wif, 'a password')
    console.log('Decripted WIF: ', myaddress.wif)

    console.log('---------------------')
    console.log('STEP 7. Send coins')
    const resp = await wallet.sendCoins({
      fromAddr: myaddress.pub,
      wif: myaddress.wif,
      toAddr: toaddress.pub,
      amount: 20000, // satoshi
      fee: 0
    })

    console.log('---------------------')
    console.log('RESULT:\n', JSON.stringify(resp, null, 2))

    console.log('---------------------')
    console.log('STEP 8. Check balance')
    for (let i = 0; i < wallet.addresses.length; i++) {
      const info = await wallet.info({ address: wallet.addresses[i].pub })
      console.log(`address ${wallet.addresses[i].pub}:\n`, info)
    }
  } catch (err) {
    console.error(err)
  }
})()
