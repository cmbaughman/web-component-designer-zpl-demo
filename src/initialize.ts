import { DocumentContainer, PaletteView, PropertyGridWithHeader } from '@node-projects/web-component-designer';
import { CodeViewMonaco } from '@node-projects/web-component-designer-codeview-monaco';
import { addZplLanguageToMonaco, createZplDesignerServiceContainer } from '@node-projects/web-component-designer-zpl';
// Import the converter, NOT the service
import { ZplToDplConverter } from './ZplToDplConverter.js';

async function initialize() {
    await window.customElements.whenDefined("node-projects-document-container");

    const paletteView = <PaletteView>document.querySelector('node-projects-palette-view');
    const propertyGridWithHeader = <PropertyGridWithHeader>document.querySelector('node-projects-web-component-designer-property-grid-with-header');

    let serviceContainer = createZplDesignerServiceContainer();
    serviceContainer.config.codeViewWidget = CodeViewMonaco;

    const documentContainer = new DocumentContainer(serviceContainer);
    documentContainer.style.gridArea = 'c';
    document.getElementById('root').appendChild(documentContainer);

    await documentContainer.ready;
    await (<CodeViewMonaco>documentContainer.codeView).ready;

    (<CodeViewMonaco>documentContainer.codeView).language = "zplLanguage";
    (<CodeViewMonaco>documentContainer.codeView).theme = "zplTheme";
    addZplLanguageToMonaco();

    paletteView.loadControls(serviceContainer, serviceContainer.getServices('elementsService'));

    propertyGridWithHeader.serviceContainer = serviceContainer;
    propertyGridWithHeader.instanceServiceContainer = documentContainer.instanceServiceContainer;

    const printZplButton = <HTMLButtonElement>document.getElementById('print-zpl-button');
    const printDplButton = <HTMLButtonElement>document.getElementById('print-dpl-button');

    // Event listener for the ZPL button
    printZplButton.addEventListener('click', async () => {
        try {
            printZplButton.disabled = true;
            printZplButton.textContent = 'Generating...';
            const zplCode = await documentContainer.codeView.getText();
            console.log("--- Generated ZPL Code ---", zplCode);
            alert("ZPL Code Generated! Check the browser's developer console.");
        } catch (error) {
            console.error("Failed to generate ZPL code:", error);
        } finally {
            printZplButton.textContent = 'Print ZPL';
            printZplButton.disabled = false;
        }
    });

    // Event listener for the DPL button
    printDplButton.addEventListener('click', async () => {
        try {
            printDplButton.disabled = true;
            printDplButton.textContent = 'Generating...';

            // 1. Get the reliable ZPL code output
            const zplCode = await documentContainer.codeView.getText();

            // 2. Create an instance of our converter
            const converter = new ZplToDplConverter();

            // 3. Convert the ZPL text to DPL text
            const dplCode = converter.convert(zplCode);

            console.log("--- Generated DPL Code ---", dplCode);
            alert("DPL Code Generated! Check the browser's developer console.");
        } catch (error) {
            console.error("Failed to generate DPL code:", error);
        } finally {
            printDplButton.textContent = 'Print DPL';
            printDplButton.disabled = false;
        }
    });
}

initialize();