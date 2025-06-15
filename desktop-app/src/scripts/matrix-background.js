/**
 * Matrix Background Effect
 * Creates a Matrix-style raining code effect on a canvas element
 */

class MatrixBackground {
    constructor(canvasSelector = '.matrix-background') {
        this.canvas = document.querySelector(canvasSelector);
        if (!this.canvas) {
            console.error('Matrix background canvas not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.fontSize = 14;
        this.columns = 0;
        this.drops = [];
        this.frameRate = 30;
        this.frameCount = 0;
        this.isRunning = false;
        
        // Initialize the effect
        this.init();
    }
    
    /**
     * Initialize the matrix background
     */
    init() {
        // Set canvas size to match window
        this.resize();
        
        // Calculate number of columns based on canvas width and font size
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        
        // Initialize drops at random positions
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.floor(Math.random() * -100);
        }
        
        // Add resize event listener
        window.addEventListener('resize', this.resize.bind(this));
        
        // Start animation
        this.start();
    }
    
    /**
     * Resize canvas to match window size
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Recalculate columns
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        
        // Reset drops if necessary
        if (this.drops.length !== this.columns) {
            this.drops = [];
            for (let i = 0; i < this.columns; i++) {
                this.drops[i] = Math.floor(Math.random() * -100);
            }
        }
    }
    
    /**
     * Start the animation
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    /**
     * Stop the animation
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame(this.animate.bind(this));
        
        // Control frame rate
        this.frameCount++;
        if (this.frameCount % (60 / this.frameRate) !== 0) return;
        
        // Semi-transparent black background to create fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Green text
        this.ctx.fillStyle = '#00ff41';
        this.ctx.font = `${this.fontSize}px monospace`;
        
        // Draw characters
        for (let i = 0; i < this.drops.length; i++) {
            // Random character
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            
            // Draw the character
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);
            
            // Move drop down
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
    }
}

// Глобальная переменная для хранения экземпляра MatrixBackground
let matrixBackgroundInstance = null;

/**
 * Инициализирует матричный фон
 * @param {string} selector - CSS селектор для canvas элемента (по умолчанию '.matrix-background')
 * @returns {MatrixBackground} - экземпляр класса MatrixBackground
 */
function initMatrixBackground(selector = '.matrix-background') {
    if (!matrixBackgroundInstance) {
        matrixBackgroundInstance = new MatrixBackground(selector);
    }
    return matrixBackgroundInstance;
}

// Initialize matrix background when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMatrixBackground();
});