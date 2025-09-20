/*
* smugjs-ui.js
* v2.0.0
* https://github.com/SMUGjs/UI (hypothetical fork)
* Apache 2.0 licensed
* 
* This is a 2025 fork of UserGui.js, updated for modern standards:
* - Bootstrap updated to v5.3.3
* - Added touch support for drag and resize
* - Expanded type properties (added range, color)
* - Improved dynamic sizing and mobile compatibility
* - Cleaner code structure with modern JS features
* - Removed annoying grant prompts
* - Enhanced error page styling
* - Better CSP handling (still uses GM_xmlhttpRequest for Bootstrap)
*/

class SmugUI {
    constructor() {
        // Assume grants are set: GM_xmlhttpRequest, GM_getValue, GM_setValue
    }

    #projectName = "SMUGjs UI";
    window = undefined;
    document = undefined;
    iFrame = undefined;
    settings = {
        "window": {
            "title": "No title set",
            "name": "userscript-gui",
            "external": false,
            "centered": false,
            "size": {
                "width": 300,
                "height": 500,
                "dynamicSize": true
            }
        },
        "gui": {
            "centeredItems": false,
            "internal": {
                "darkCloseButton": false,
                "style": `
                    body {
                        background-color: #ffffff;
                        overflow: hidden;
                        width: 100% !important;
                    }

                    form {
                        padding: 10px;
                    }
            
                    #gui {
                        height: fit-content;
                    }
            
                    .rendered-form {
                        padding: 10px;
                    }

                    #header {
                        padding: 10px;
                        cursor: move;
                        z-index: 10;
                        background-color: #2196F3;
                        color: #fff;
                        height: fit-content;
                    }

                    .header-item-container {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
            
                    .left-title {
                        font-size: 14px;
                        font-weight: bold;
                        padding: 0;
                        margin: 0;
                    }
                    
                    #button-close-gui {
                        vertical-align: middle;
                    }

                    div .form-group {
                        margin-bottom: 15px;
                    }

                    #resizer {
                        width: 10px;
                        height: 10px;
                        cursor: se-resize;
                        position: absolute;
                        bottom: 0;
                        right: 0;
                    }

                    .formbuilder-button {
                        width: fit-content;
                    }
                `
            },
            "external": {
                "popup": true,
                "style": `
                    .rendered-form {
                        padding: 10px; 
                    }
                    div .form-group {
                        margin-bottom: 15px;
                    }
                `
            }
        },
        "messages": {
            "blockedPopups": () => alert(`The GUI failed to open! Possible reason: Popups are blocked. Please allow popups for this site. (${window.location.hostname})`)
        }
    };

    // Updated error page with better styling
    #errorPage = (title, code) => `
        <style>
            .error-page {
                width: 100%;
                height: fit-content;
                background-color: #f8d7da;
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 25px;
                border-radius: 8px;
                border: 1px solid #f5c2c7;
            }
            .error-page-text {
                font-family: sans-serif;
                font-size: large;
                color: #721c24;
            }
            .error-page-tag {
                margin-top: 20px;
                font-size: 12px;
                color: #a94442;
                font-style: italic;
                margin-bottom: 0px;
            }
        </style>
        <div class="error-page">
            <div>
                <p class="error-page-text">${title}</p>
                <code>${code}</code>
                <p class="error-page-tag">${this.#projectName} error message</p>
            </div>
        </div>`;

    #guiPages = [
        {
            "name": "default_no_content_set",
            "content": this.#errorPage("Content missing", "SmugUI.setContent(html, tabName);")
        }
    ];

    async #bypassCors(externalFile) {
        const res = await new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: externalFile,
                onload: resolve
            });
        });
        return res.responseText;
    }

    #createNavigationTab(page) {
        const name = page.name;
        if (name == undefined) {
            console.error(`[${this.#projectName}] addPage(html, name) <- name missing!`);
            return undefined;
        }
        const modifiedName = name.toLowerCase().replaceAll(' ', '').replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000000000);
        const content = page.content;
        const indexOnArray = this.#guiPages.map(x => x.name).indexOf(name);
        const firstItem = indexOnArray === 0;

        return {
            "listItem": `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${firstItem ? 'active' : ''}" id="${modifiedName}-tab" data-bs-toggle="tab" data-bs-target="#${modifiedName}" type="button" role="tab" aria-controls="${modifiedName}" aria-selected="${firstItem}">${name}</button>
                </li>
            `,
            "panelItem": `
                <div class="tab-pane ${firstItem ? 'active' : ''}" id="${modifiedName}" role="tabpanel" aria-labelledby="${modifiedName}-tab">${content}</div>
            `
        };
    }

    #initializeTabs() {
        const handleTabClick = e => {
            const target = e.target;
            const contentID = target.getAttribute("data-bs-target");

            target.classList.add("active");
            this.document.querySelector(contentID).classList.add("active show"); // Added 'show' for Bootstrap 5

            [...this.document.querySelectorAll(".nav-link")].forEach(tab => {
                if (tab !== target) {
                    const contentID = tab.getAttribute("data-bs-target");
                    tab.classList.remove("active");
                    this.document.querySelector(contentID).classList.remove("active", "show");
                }
            });
        };

        [...this.document.querySelectorAll(".nav-link")].forEach(tab => {
            tab.addEventListener("click", handleTabClick);
        });
    }

    #getContent() {
        if (this.#guiPages.length === 1) {
            return this.#guiPages[0].content;
        } else if (this.#guiPages.length > 1) {
            const tabs = (list, panels) => `
                <ul class="nav nav-tabs" id="userscript-tab" role="tablist">
                    ${list}
                </ul>
                <div class="tab-content">
                    ${panels}
                </div>
            `;

            let list = ``;
            let panels = ``;

            this.#guiPages.forEach(page => {
                const data = this.#createNavigationTab(page);
                if (data !== undefined) {
                    list += data.listItem + '\n';
                    panels += data.panelItem + '\n';
                }
            });

            return tabs(list, panels);
        }
    }

    async #createDocument() {
        const bootstrapStyling = await this.#bypassCors("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css");

        const externalDocument = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${this.settings.window.title}</title>
            <style>
            ${bootstrapStyling}
            ${this.settings.gui.external.style}
            ${
            this.settings.gui.centeredItems 
                ? `.form-group {
                        display: flex;
                        justify-content: center;
                    }`
                : ""
            }
            </style>
        </head>
        <body>
        ${this.#getContent()}
        </body>
        </html>
        `;

        const internalDocument = `
        <!doctype html>
        <html lang="en">
        <head>
            <style>
            ${bootstrapStyling}
            ${this.settings.gui.internal.style}
            ${
            this.settings.gui.centeredItems 
                ? `.form-group {
                        display: flex;
                        justify-content: center;
                    }`
                : ""
            }
            </style>
        </head>
        <body>
            <div id="gui">
                <div id="header">
                    <div class="header-item-container">
                        <h1 class="left-title">${this.settings.window.title}</h1>
                        <div class="right-buttons">
                            <button type="button" class="${this.settings.gui.internal.darkCloseButton ? "btn-close" : "btn-close btn-close-white"}" aria-label="Close" id="button-close-gui"></button>
                        </div>
                    </div>
                </div>
                <div id="content">
                ${this.#getContent()}
                </div>
                <div id="resizer"></div>
            </div>
        </body>
        </html>
        `;

        return this.settings.window.external ? externalDocument : internalDocument;
    }

    addPage(tabName, htmlString) {
        if (this.#guiPages[0].name === "default_no_content_set") {
            this.#guiPages = [];
        }

        this.#guiPages.push({
            "name": tabName,
            "content": htmlString
        });
    }

    #getCenterScreenPosition() {
        const guiWidth = this.settings.window.size.width;
        const guiHeight = this.settings.window.size.height;

        const x = (screen.width - guiWidth) / 2;
        const y = (screen.height - guiHeight) / 2;

        return { "x": x, "y": y };
    }

    #initializeInternalGuiEvents(iFrame) {
        // Improved drag and resize with touch support

        const setFrameSize = (x, y) => {
            iFrame.style.width = `${x}px`;
            iFrame.style.height = `${y}px`;
        };

        const getFrameSize = () => {
            const frameBounds = iFrame.getBoundingClientRect();
            return { "width": frameBounds.width, "height": frameBounds.height };
        };

        const setFramePos = (x, y) => {
            iFrame.style.left = `${x}px`;
            iFrame.style.top = `${y}px`;
        };

        const getFramePos = () => {
            const frameBounds = iFrame.getBoundingClientRect();
            return { "x": frameBounds.x, "y": frameBounds.y };
        };

        const getInnerFrameSize = () => {
            const innerFrameElem = iFrame.contentDocument.querySelector("#gui");
            return { "x": innerFrameElem.offsetWidth, "y": innerFrameElem.offsetHeight };
        };

        const adjustFrameSize = () => {
            if (this.settings.window.size.dynamicSize) {
                const innerFrameSize = getInnerFrameSize();
                setFrameSize(innerFrameSize.x, innerFrameSize.y);
            }
        };

        let dragging = false;
        let resizing = false;
        let startPos = { x: 0, y: 0 };
        let startSize = { width: 0, height: 0 };

        const handleStart = (e, isDrag) => {
            e.preventDefault();
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            if (isDrag) {
                dragging = true;
                startPos.x = clientX - iFrame.offsetLeft;
                startPos.y = clientY - iFrame.offsetTop;
            } else {
                resizing = true;
                startPos.x = clientX;
                startPos.y = clientY;
                startSize.width = parseInt(document.defaultView.getComputedStyle(iFrame).width, 10);
                startSize.height = parseInt(document.defaultView.getComputedStyle(iFrame).height, 10);
            }
        };

        const handleMove = (e) => {
            if (!dragging && !resizing) return;

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            if (dragging) {
                let x = clientX - startPos.x;
                let y = clientY - startPos.y;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const bR = iFrame.getBoundingClientRect();

                x = Math.max(0, Math.min(x, windowWidth - bR.width));
                y = Math.max(0, Math.min(y, windowHeight - bR.height));

                setFramePos(x, y);
            } else if (resizing) {
                const width = startSize.width + (clientX - startPos.x);
                const height = startSize.height + (clientY - startPos.y);
                if (width > 160 && height > 90) {
                    setFrameSize(width, height);
                }
            }
        };

        const handleEnd = () => {
            dragging = false;
            resizing = false;
        };

        // Drag events
        const header = this.document.querySelector("#header");
        header.addEventListener('mousedown', (e) => handleStart(e, true));
        header.addEventListener('touchstart', (e) => handleStart(e, true));

        // Resize events
        const resizer = this.document.querySelector("#resizer");
        resizer.addEventListener('mousedown', (e) => handleStart(e, false));
        resizer.addEventListener('touchstart', (e) => handleStart(e, false));

        // Move events
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        this.document.addEventListener('mousemove', handleMove);
        this.document.addEventListener('touchmove', handleMove, { passive: false });

        // End events
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
        this.document.addEventListener('mouseup', handleEnd);
        this.document.addEventListener('touchend', handleEnd);

        // Close button
        this.document.querySelector("#button-close-gui").addEventListener('click', () => this.close());

        // Observer for dynamic size
        const guiObserver = new MutationObserver(adjustFrameSize);
        const guiElement = this.document.querySelector("#gui");
        guiObserver.observe(guiElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        adjustFrameSize();
    }

    async #openExternalGui(readyFunction) {
        if (this.window?.closed || this.window === undefined) {
            let pos = "";
            let windowSettings = "";

            if (this.settings.window.centered && this.settings.gui.external.popup) {
                const centerPos = this.#getCenterScreenPosition();
                pos = `left=${centerPos.x},top=${centerPos.y}`;
            }

            if (this.settings.gui.external.popup) {
                windowSettings = `width=${this.settings.window.size.width},height=${this.settings.window.size.height},${pos}`;
            }

            this.window = window.open("", this.settings.window.name, windowSettings);

            if (!this.window) {
                this.settings.messages.blockedPopups();
                return;
            }

            this.window.document.write(await this.#createDocument());

            if (!this.settings.gui.external.popup) {
                this.window.document.body.style.width = `${this.settings.window.size.width}px`;
                if (this.settings.window.centered) {
                    const centerPos = this.#getCenterScreenPosition();
                    this.window.document.body.style.position = "absolute";
                    this.window.document.body.style.left = `${centerPos.x}px`;
                    this.window.document.body.style.top = `${centerPos.y}px`;
                }
            }

            // Dynamic height
            this.window.resizeTo(
                this.window.outerWidth,
                this.settings.window.size.dynamicSize 
                    ? this.window.document.body.offsetHeight + (this.window.outerHeight - this.window.innerHeight)
                    : this.window.outerHeight
            );

            this.document = this.window.document;
            this.#initializeTabs();

            if (typeof readyFunction === "function") {
                readyFunction();
            }

            window.onbeforeunload = () => this.close();
        } else {
            this.window.focus();
        }
    }

    async #openInternalGui(readyFunction) {
        if (this.iFrame) return;

        const fadeInSpeedMs = 250;
        let left = 0, top = 0;

        if (this.settings.window.centered) {
            const centerPos = this.#getCenterScreenPosition();
            left = centerPos.x;
            top = centerPos.y;
        }

        const iframe = document.createElement("iframe");
        iframe.srcdoc = await this.#createDocument();
        iframe.style = `
            position: fixed;
            top: ${top}px;
            left: ${left}px;
            width: ${this.settings.window.size.width}px;
            height: ${this.settings.window.size.height}px;
            border: 0;
            opacity: 0;
            transition: opacity ${fadeInSpeedMs/1000}s;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            z-index: 2147483647;
        `;

        const waitForBody = setInterval(() => {
            if (document.body) {
                clearInterval(waitForBody);
                document.body.prepend(iframe);

                iframe.contentWindow.onload = () => {
                    setTimeout(() => iframe.style.opacity = "1", fadeInSpeedMs / 2);

                    this.window = iframe.contentWindow;
                    this.document = iframe.contentDocument;
                    this.iFrame = iframe;

                    this.#initializeInternalGuiEvents(iframe);
                    this.#initializeTabs();

                    if (typeof readyFunction === "function") {
                        readyFunction();
                    }
                };
            }
        }, 100);
    }

    open(readyFunction) {
        if (this.settings.window.external) {
            this.#openExternalGui(readyFunction);
        } else {
            this.#openInternalGui(readyFunction);
        }
    }

    close() {
        if (this.settings.window.external) {
            if (this.window) this.window.close();
        } else {
            if (this.iFrame) {
                this.iFrame.remove();
                this.iFrame = undefined;
            }
        }
    }

    saveConfig() {
        let config = [];
        if (this.document) {
            [...this.document.querySelectorAll(".form-group")].forEach(elem => {
                const inputElem = elem.querySelector("[name]");
                const name = inputElem?.getAttribute("name");
                const data = this.getData(name);
                if (data !== undefined) {
                    config.push({ "name": name, "value": data });
                }
            });
        }
        GM_setValue("config", config);
    }

    loadConfig() {
        const config = this.getConfig();
        if (this.document && config) {
            config.forEach(elemConfig => {
                this.setData(elemConfig.name, elemConfig.value);
            });
        }
    }

    getConfig() {
        return GM_getValue("config", []);
    }

    resetConfig() {
        GM_setValue("config", []);
    }

    dispatchFormEvent(name) {
        const type = name.split("-")[0].toLowerCase();
        const properties = this.#typeProperties.find(x => type === x.type);
        if (properties) {
            const event = new Event(properties.event);
            const field = this.document.querySelector(`.field-${name}`);
            field.dispatchEvent(event);
        }
    }

    setPrimaryColor(hex) {
        const styles = `
            #header {
                background-color: ${hex} !important;
            }
            .nav-link {
                color: ${hex} !important;
            }
            .text-primary {
                color: ${hex} !important;
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        this.document.head.appendChild(styleSheet);
    }

    event(name, eventType, eventFunction) {
        const elem = this.document.querySelector(`.field-${name}`);
        if (elem) {
            elem.addEventListener(eventType, eventFunction);
        }
    }

    disable(name) {
        const field = this.document.querySelector(`.field-${name}`);
        if (field) {
            [...field.children].forEach(child => child.disabled = true);
        }
    }

    enable(name) {
        const field = this.document.querySelector(`.field-${name}`);
        if (field) {
            [...field.children].forEach(child => child.disabled = false);
        }
    }

    getValue(name) {
        const elem = this.document.querySelector(`.field-${name} [id=${name}]`);
        return elem ? elem.value : undefined;
    }

    setValue(name, newValue) {
        const elem = this.document.querySelector(`.field-${name} [id=${name}]`);
        if (elem) {
            elem.value = newValue;
            this.dispatchFormEvent(name);
        }
    }

    getSelection(name) {
        const elem = this.document.querySelector(`.field-${name} input[name=${name}]:checked`);
        return elem ? elem.value : undefined;
    }

    setSelection(name, newValue) {
        const elem = this.document.querySelector(`.field-${name} input[value="${newValue}"]`);
        if (elem) {
            elem.checked = true;
            this.dispatchFormEvent(name);
        }
    }

    getChecked(name) {
        return [...this.document.querySelectorAll(`.field-${name} input[name*=${name}]:checked`)].map(cb => cb.value);
    }

    setChecked(name, checkedArr) {
        [...this.document.querySelectorAll(`.field-${name} input[name*=${name}]`)].forEach(cb => {
            cb.checked = checkedArr.includes(cb.value);
        });
        this.dispatchFormEvent(name);
    }

    getFiles(name) {
        const elem = this.document.querySelector(`.field-${name} input[id=${name}]`);
        return elem ? elem.files : undefined;
    }

    getOption(name) {
        const elem = this.document.querySelector(`.field-${name} select[id=${name}]`);
        return elem ? elem.value : undefined;
    }

    setOption(name, newValue) {
        const elem = this.document.querySelector(`.field-${name} select[id=${name}]`);
        if (elem) {
            elem.value = newValue;
            this.dispatchFormEvent(name);
        }
    }

    #typeProperties = [
        { type: "button", event: "click", function: { get: null, set: null } },
        { type: "radio", event: "change", function: { get: n => this.getSelection(n), set: (n, v) => this.setSelection(n, v) } },
        { type: "checkbox", event: "change", function: { get: n => this.getChecked(n), set: (n, v) => this.setChecked(n, v) } },
        { type: "date", event: "change", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } },
        { type: "file", event: "change", function: { get: n => this.getFiles(n), set: null } },
        { type: "number", event: "input", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } },
        { type: "select", event: "change", function: { get: n => this.getOption(n), set: (n, v) => this.setOption(n, v) } },
        { type: "text", event: "input", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } },
        { type: "textarea", event: "input", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } },
        // New types
        { type: "range", event: "input", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } },
        { type: "color", event: "input", function: { get: n => this.getValue(n), set: (n, v) => this.setValue(n, v) } }
    ];

    smartEvent(name, eventFunction) {
        if (name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => x.type === type);
            if (properties) {
                this.event(name, properties.event, eventFunction);
            } else {
                console.warn(`${this.#projectName}'s smartEvent did not find match for type "${type}".`);
            }
        } else {
            console.warn(`Invalid name "${name}" for smartEvent.`);
        }
    }

    getData(name) {
        if (name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => x.type === type);
            if (properties && typeof properties.function.get === "function") {
                return properties.function.get(name);
            } else {
                console.error(`${this.#projectName}'s getData can't be used for type "${type}".`);
            }
        } else {
            console.warn(`Invalid name "${name}" for getData.`);
        }
    }

    setData(name, newData) {
        if (name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => x.type === type);
            if (properties && typeof properties.function.set === "function") {
                properties.function.set(name, newData);
            } else {
                console.error(`${this.#projectName}'s setData can't be used for type "${type}".`);
            }
        } else {
            console.warn(`Invalid name "${name}" for setData.`);
        }
    }
};
