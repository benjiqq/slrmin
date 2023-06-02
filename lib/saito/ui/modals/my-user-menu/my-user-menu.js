const SaitoOverlay = require("../../saito-overlay/saito-overlay");
const myUserMenuTemplate = require("./my-user-menu.template");

/*
 * Do we really need a seperate myusermenu when we can just add some filtering in the individual modules to respond appropriately 
 * as to whether it is our own key or someone else's key?
 *
 * To Do -- update qrscanner and saito-header to drop myUserMenu
 *
*/

class MyUserMenu {

    constructor(app, publickey) {
        this.app = app;
        this.publickey = publickey;
        this.overlay = new SaitoOverlay(app, null, true, true);
        this.callbacks = {}
    }

    render() {

        console.log("rendering my user menu!");

        let thisobj = this;
        if (!document.querySelector("#saito-user-menu")) {
            this.overlay.show(myUserMenuTemplate());
            let mods = this.app.modules.respondTo("user-menu");
            let index = 0;
            mods.forEach((mod) => {
                let item = mod.respondTo('user-menu');

                if (item instanceof Array) {
                    item.forEach(j => {

                        if (j.text === "Add Contact") { return; }
                        if (j.text === "Challenge to Game") { return; }
                        if (j.text === "View Profile") { j.text = "View My Profile"; }

                        let id = `user_menu_item_${index}`;
                        thisobj.callbacks[id] = j.callback;
                        thisobj.addMenuItem(j, id);
                        index++;
                    })

                } else {

                    if (item.text === "Add Contact") { return; }
                    if (item.text === "Challenge to Game") { return; }
                    if (item.text === "View Profile") { item.text = "View My Profile"; }

                    let id = `user_menu_item_${index}`;
                    thisobj.callbacks[id] = item.callback;
                    thisobj.addMenuItem(item, id);
                }

                index++;
            })
        }
        this.attachEvents()
    }


    attachEvents() {
    	let thisobj = this;
    	let pk = this.publickey;
        document.querySelectorAll('.saito-modal-menu-option').forEach(menu => {
            let id = menu.getAttribute("id");
            let callback = thisobj.callbacks[id];
            menu.addEventListener('click', () => {
                callback(this.app, pk);
                thisobj.overlay.remove();
            })

        })
    }

    addMenuItem(item, id) {
        document.querySelector(".saito-modal-content").innerHTML += `
          <div id="${id}" class="saito-modal-menu-option"><i class="${item.icon}"></i><div>${item.text}</div></div>
        `;
    }
}


module.exports = MyUserMenu;
