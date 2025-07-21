import { DocumentContainer, PaletteView, PropertyGridWithHeader } from '@node-projects/web-component-designer';
import { CodeViewMonaco } from '@node-projects/web-component-designer-codeview-monaco';
import { addZplLanguageToMonaco, createZplDesignerServiceContainer } from '@node-projects/web-component-designer-zpl';
import { DplLayoutPrinterService } from './DplLayoutPrinterService.js';

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

  printDplButton.addEventListener('click', async () => {
    try {
      printDplButton.disabled = true;
      printDplButton.textContent = 'Generating...';

      const dplService = new DplLayoutPrinterService();

      // --- THE DEFINITIVE FIX ---
      // Call the .children() method to get the list of items.
      const designItems = documentContainer.designerView.designerCanvas.rootDesignItem.children();
      const dplCode = await dplService.print(designItems);

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