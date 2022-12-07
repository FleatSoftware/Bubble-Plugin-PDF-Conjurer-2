function(properties, context) {

	const PDFPrinter = require('pdfmake');
    const { Writable } = require('stream');
    
    const fetch = require('node-fetch');    
    // const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    
    // Load configs    
    const { 
        prev_configs, 
        file_name: fileName,
        set_data_header
    } = properties;
    
    const configs = JSON.parse(prev_configs);
    
    const { defaultFonts, addedFonts, addedImages, headerOptions, footerOptions, docDefinition } = configs;
    
    // Helper funtions
    async function loadFilesFromURL(url) {
        const fixedProtocol = url.startsWith('http') ? url : 'https:' + url;
        
        const response = await fetch(fixedProtocol);
        
        if (!response.ok) throw new Error(`Request failed with status code ${response.status}`);
               
        return await response.buffer();
    }
    
    async function loadFonts(addedFonts) {
        const fonts = {};
        
        for (let fontName in addedFonts) {
            const font = addedFonts[fontName];
            
            fonts[fontName] = {};
            
            for (const type in font) {
                const url = font[type];
                
                fonts[fontName][type] = await loadFilesFromURL(url);
            }
        }
        
        return fonts;
    }
    
    async function loadImages(addedImages) {
        let images = {};
        
        for (const imageName in addedImages) {
            const url = addedImages[imageName];
            
            images[imageName] = await loadFilesFromURL(url);
        }
        
        return images;
    }
    
    // Load fonts and images
    const { loadedFonts, loadedImages } = context.async(async (callback) => {
        try {
            const loadedFonts = await loadFonts(addedFonts);
            const loadedImages = await loadImages(addedImages);
            
            callback(null, { loadedFonts, loadedImages });
        } catch (err) {
            callback(err);
        }
    });
    
    const fonts = { ...defaultFonts, ...loadedFonts };
    
    // Configure PDF Printer;
    
    const printer = new PDFPrinter(fonts);
    
    // Configure docDefinition
    
    docDefinition.images = loadedImages;
    
    docDefinition.info = { 
    	title: fileName.slice(-4) === '.pdf' ? fileName.slice(0, -4) : fileName,
   	};
    
    // Configure docDefinition header and footer 
    // Unfortunately this code snippet cannot be in the corresponding actions, because there is no way to pass methods through a JSON, when we use the stringify method
    
    if (headerOptions) {
        docDefinition.header = (currentPage, pageCount, pageSize) => {
      		const { 
                showPageNumbers, 
                evenPageAlignment, 
                oddPageAlignment, 
                excludePagesCounter, 
                startCountOnSecondPage, 
                counterMargins, 
                excludePagesElements, 
                elements, 
            } = configs.headerOptions;

      		const content = [];
            
            if (startCountOnSecondPage) currentPage--;

      		if (showPageNumbers && !excludePagesCounter.includes(currentPage)) {
        		const counter = {
          			text: currentPage,
                    alignment: (currentPage % 2) ? oddPageAlignment : evenPageAlignment,
                    margin: counterMargins,
        		};
                
                content.push(counter);
      		}
            
            if (!excludePagesElements.includes(currentPage) && elements.length > 0) {
                const contents = { columns: elements };
                content.push(contents);
            }

      		return content;
    	};
	}
    
    if (footerOptions) {
        docDefinition.footer = (currentPage, pageCount, pageSize) => {
      		const { 
                showPageNumbers, 
                evenPageAlignment, 
                oddPageAlignment, 
                excludePagesCounter, 
                startCountOnSecondPage, 
                counterMargins, 
                excludePagesElements, 
                elements, 
            } = configs.footerOptions;

      		const content = [];
            
            if (startCountOnSecondPage) currentPage--;
            
            if (!excludePagesElements.includes(currentPage) && elements.length > 0) {
                const contents = { columns: elements };
                content.push(contents);
            }
            
            if (showPageNumbers && !excludePagesCounter.includes(currentPage)) {
        		const counter = {
          			text: currentPage,
                    alignment: (currentPage % 2) ? oddPageAlignment : evenPageAlignment,
                    margin: counterMargins,
                    style: counterStyle,

        		};
                
                content.push(counter);
      		}

      		return content;
    	};
	}
    
    // Table Layouts
    
    const tableLayouts = {
        strongOuterBorder: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 2 : 1,
            vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 2 : 1,
       		hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? 'black' : 'gray',
            vLineColor: (i, node) => (i === 0 || i === node.table.widths.length) ? 'black' : 'gray',
        },
        
        zebra: {
            fillColor: (i) => (i % 2 === 0) ? '#CCCCCC' : null,
        },
        
        code: {
            fillColor: () => '#23241f',
            vLineWidth: () => 0,
            hLineWidth: () => 0,
        },
        
        quote: {
            vLineWidth: () => 5,
            vLineColor: () => '#ccc',
            hLineWidth: () => 0,
            paddingLeft: () => 20,
        },
    };
    
    // Funtion to get the resulting PDF in base64
    
    function getResultingPDF(docDefinition, options = {}) {
        return new Promise((resolve, reject) => {
            const writable = new Writable();
            
            const base64 = [];
            
            writable._write = (chunk, encoding, next) => {
                const data = chunk.toString();
                base64.push(data);
                next();
            };
            
            writable._final = (cb) => {
                const result = base64.join('');
                resolve(result);
                cb();
            };
            
            const doc = printer.createPdfKitDocument(docDefinition, options);

      		doc.setEncoding('base64');
      		doc.pipe(writable);
      		doc.end();
        });
    }
    
    // Make the PDF File
    
    const resultingPDF = context.async(async (callback) => {
        try {
            const result = await getResultingPDF(docDefinition, { tableLayouts });
            
            callback(null, result);
        } catch (err) {
            callback(err);
        }
    });
    
    const content = set_data_header ? 'data:application/pdf;base64,' + resultingPDF : resultingPDF;
    
    const file_name = fileName.slice(-4) === '.pdf' ? fileName : fileName + '.pdf';
	
    return { file_name, content };
}