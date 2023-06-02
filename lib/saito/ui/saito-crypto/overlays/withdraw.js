const WithdrawTemplate = require("./withdraw.template");
const SaitoOverlay = require("./../../saito-overlay/saito-overlay");

class Withdraw {

  constructor(app, mod, container = "") {

    this.app = app;
    this.mod = mod;
    this.container = container;
    this.overlay = new SaitoOverlay(this.app, this.mod);

    this.ticker = "";
    this.amount = "";
    this.address = "";
    this.balance = 0;
    
    this.app.connection.on("saito-crypto-withdraw-render-request", (obj) => {
      if (obj.amount) { this.amount = obj.amount; }
      if (obj.ticker) { this.ticker = obj.ticker; } 
      if (obj.address) { this.address = obj.address; }
      this.render();
    });
  }

  render() {
    this.overlay.show(WithdrawTemplate(this.app, this.mod, this));
    this.loadCryptos();
    this.attachEvents();
  }  


  loadCryptos(ticker = null) {

    let available_cryptos = this.app.wallet.returnInstalledCryptos();
    let preferred_crypto = this.app.wallet.returnPreferredCrypto();
    let sender = preferred_crypto.returnAddress();
    let fee = 0;
    let balance = 0;
    let asset_id = '';

    // add crytpo dropdown html
    document.querySelector("#withdraw-select-crypto").innerHTML = ""; 
    document.querySelector("#withdraw-logo-cont").innerHTML = ""; 
    let html = '';
    let img_html = ``;
    for (let i = 0; i < available_cryptos.length; i++) {

      let crypto_mod = available_cryptos[i];
      
      if (ticker != null && crypto_mod.ticker == ticker) {
        preferred_crypto = crypto_mod; 
      }

      html = `<option ${(crypto_mod.name == preferred_crypto.name) ? 'selected' : ``} 
      id="crypto-option-${crypto_mod.name}" value="${crypto_mod.ticker}">${crypto_mod.ticker}</option>`;

      if (crypto_mod.ticker == 'SAITO') {
        img_html = `<img class="withdraw-img-${crypto_mod.ticker} hide-element" src="/saito/img/touch/pwa-192x192.png">`;
      } else {
        img_html = `<img class="withdraw-img-${crypto_mod.ticker} hide-element" src="/${(crypto_mod.ticker).toLowerCase()}/img/logo.png">`;
      }

      this.app.browser.addElementToElement(html, document.querySelector("#withdraw-select-crypto"));
      this.app.browser.addElementToElement(img_html, document.querySelector("#withdraw-logo-cont"));
    }

    document.querySelector(".withdraw-img-"+preferred_crypto.ticker).classList.remove("hide-element");

    // calculate fee & balance
    if (preferred_crypto.ticker == "SAITO") {
      fee = this.app.wallet.wallet.default_fee;
      balance = this.app.wallet.wallet.balance;
    } else {
      asset_id = preferred_crypto.asset_id;

      this.mod.checkWithdrawalFee(asset_id, function(fee) {
        fee = fee;
        document.querySelector(".withdraw-info-value.fee").innerHTML = fee + ` ${preferred_crypto.ticker}`;
        document.querySelector("#withdraw-fee").value = fee;
      });

      balance = preferred_crypto.balance;
    }

    // update inputs 
    document.querySelector("#withdraw-ticker").value = preferred_crypto.ticker;
    document.querySelector("#withdraw-balance").value = balance;
    document.querySelector("#withdraw-asset-id").value = asset_id;
    document.querySelector("#withdraw-sender").value = sender;
    document.querySelector("#withdraw-fee").value = fee;


    // show fee & balance
    document.querySelector(".withdraw-info-value.fee").innerHTML = fee + ` ${preferred_crypto.ticker}`;
    document.querySelector(".withdraw-info-value.balance").innerHTML = balance + ` ${preferred_crypto.ticker}`;

    this.attachDropdownEvents();
  }



  attachDropdownEvents() {
    this_withdraw = this;
    document.querySelector("#withdraw-select-crypto").onchange = (e) => {
      let element = e.target;

      if (element.value === "add-new") {
        let current_default = app.wallet.returnPreferredCrypto();
        let select_box = document.querySelector(".saito-select-crypto");
        select_box.value = current_default.name;
        let appstore_mod = app.modules.returnModule("AppStore");
        if (appstore_mod) {
          let options = { search: "", category: "Cryptocurrency", featured: 1 };
          appstore_mod.openAppstoreOverlay(options);
        } else {
          salert("Cannot install other cryptocurrencies without the appstore!");
        }
        return;
      }

      document.querySelector(".withdraw-info-value.fee").innerHTML = `fetching...`;
      document.querySelector(".withdraw-info-value.balance").innerHTML = `fetching...`;

      this.app.wallet.setPreferredCrypto(element.value, 1);
      setTimeout(function(){
        this_withdraw.loadCryptos(element.value);
      }, 1500);
    };
  }

  attachEvents() {    

        if (document.querySelector("#withdrawal-form") != null) {
          document.querySelector("#withdrawal-form").onsubmit = (e) => {
            e.preventDefault();

            let amount = document.querySelector("#withdraw-input-amount").value;
            let address = document.querySelector("#withdraw-input-address").value;
            let amount_avl = document.querySelector("#withdraw-balance").value;
            let fee = document.querySelector("#withdraw-fee").value;
            let ticker = document.querySelector("#withdraw-ticker").value;

            if (amount <= 0) {
              salert("Error: Amount should be greater than 0");
              return false;          
            }

            if (amount > amount_avl) {
              salert("Error: Not enough amount available ("+amount_avl+" available)");
              return false;          
            }

            document.querySelector(".withdraw-confirm-amount").innerText = `${amount} ${ticker}`;
            document.querySelector(".withdraw-confirm-address").innerText = address;
            document.querySelector(".withdraw-confirm-fee").innerText = `(fee: ${fee} ${ticker})`;

            document.querySelector("#withdraw-step-one").classList.toggle("hide-element");
            document.querySelector("#withdraw-step-two").classList.toggle("hide-element");
          }

          document.querySelector("#withdraw-cancel").onclick = (e) => {
            e.preventDefault();
            document.querySelector("#withdraw-step-one").classList.toggle("hide-element");
            document.querySelector("#withdraw-step-two").classList.toggle("hide-element");
          }
        

          document.querySelector("#withdraw-confirm").onclick = (e) => {
            e.preventDefault();

            try {

              let amount = document.querySelector("#withdraw-input-amount").value;
              let address = document.querySelector("#withdraw-input-address").value;
              let amount_avl = document.querySelector("#withdraw-balance").value;
              let fee = document.querySelector("#withdraw-fee").value;
              let ticker = document.querySelector("#withdraw-ticker").value;
              let sender = document.querySelector("#withdraw-sender").value;

              document.querySelector(".withdraw-msg-icon").classList.toggle("fa-circle-exclamation");
              document.querySelector(".withdraw-msg-icon").classList.toggle("fa-circle-notch");
              document.querySelector(".confirm-submit").style.opacity = 0;
              document.querySelector(".withdraw-msg-text").innerText = "Sending";
              document.querySelector(".withdraw-msg-question").innerText = "...";


              let hash = this.app.wallet.sendPayment([sender], [address], [amount], (new Date().getTime()), btoa(sender+address+amount+Date.now()), function() {
                setTimeout(function(){
                  document.querySelector(".confirm-msg").innerHTML = `Your transaction has been broadcast <br > Please check transaction history in the sidebar menu for confirmation`;
                  document.querySelector(".withdraw-msg-icon").classList.toggle("fa-circle-notch");
                  document.querySelector(".withdraw-msg-icon").classList.toggle("fa-circle-check");
                }, 1000);
              }, ticker);

              console.log("hash ///");
              console.log(hash);
                        
            } catch(err) {
              document.querySelector(".confirm-msg").innerHTML = `Transfer request unsuccessful <br > Please try again`;
              document.querySelector(".withdraw-msg-icon").classList.remove("fa-circle-notch");
              document.querySelector(".withdraw-msg-icon").classList.remove("fa-circle-check");
              document.querySelector(".withdraw-msg-icon").classList.toggle("fa-circle-xmark");
            }
          }

        }


        if (document.querySelector("#withdraw-max-btn") != null) {
          document.querySelector("#withdraw-max-btn").onclick = (e) => {
            let amount_avl = document.querySelector("#withdraw-balance").value;
            document.querySelector("#withdraw-input-amount").value = amount_avl;
          }
        }

  }

}

module.exports = Withdraw;

