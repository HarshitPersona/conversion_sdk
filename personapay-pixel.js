/**
 * PersonaPay Conversion Tracking Pixel
 * 
 * This script allows advertisers to track conversions by calling the PersonaPay
 * conversion webhook from their frontend.
 * 
 * Usage:
 * 1. Include this script on your website
 * 2. Call PersonaPayPixel.trackConversion() when a conversion occurs
 * 
 * Example:
 * PersonaPayPixel.trackConversion({
 *   eventId: 'conv_12345',
 *   sessionId: 'sess_67890',
 *   metadata: { orderId: 'order_001', value: 99.99 }
 * });
 */

(function(window) {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        apiUrl: 'https://dev.personapay.tech/advertisers/campaign/conversion/webhook',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        debug: false
    };

    /**
     * PersonaPay Pixel Class
     */
    class PersonaPayPixel {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.log('PersonaPay Pixel initialized', this.config);
        }

        /**
         * Log messages if debug mode is enabled
         */
        log(message, data = null) {
            if (this.config.debug) {
                console.log('[PersonaPay Pixel]', message, data);
            }
        }

        /**
         * Generate a unique session ID if not provided
         */
        generateSessionId() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Validate conversion data
         */
        validateConversionData(data) {
            if (!data) {
                throw new Error('Conversion data is required');
            }

            if (!data.eventId) {
                throw new Error('eventId is required');
            }

            // Generate sessionId if not provided
            if (!data.sessionId) {
                data.sessionId = this.generateSessionId();
                this.log('Generated sessionId:', data.sessionId);
            }

            return data;
        }

        /**
         * Send conversion data to the webhook
         */
        async sendConversion(data, attempt = 1) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const timeout = setTimeout(() => {
                    xhr.abort();
                    reject(new Error('Request timeout'));
                }, this.config.timeout);

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        clearTimeout(timeout);
                        
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(response);
                            } catch (e) {
                                resolve({ success: true, message: 'Conversion tracked successfully' });
                            }
                        } else {
                            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                        }
                    }
                };

                xhr.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Network error'));
                };

                try {
                    xhr.open('POST', this.config.apiUrl, true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify(data));
                    this.log('Sending conversion data (attempt ' + attempt + '):', data);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        }

        /**
         * Track a conversion with retry logic
         */
        async trackConversion(conversionData) {
            try {
                // Validate and prepare data
                const data = this.validateConversionData(conversionData);
                
                // Add timestamp if not provided
                if (!data.triggeredAt) {
                    data.triggeredAt = Date.now();
                }

                // Try to send the conversion
                for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
                    try {
                        const response = await this.sendConversion(data, attempt);
                        this.log('Conversion tracked successfully:', response);
                        return response;
                    } catch (error) {
                        this.log(`Attempt ${attempt} failed:`, error.message);
                        
                        if (attempt === this.config.retryAttempts) {
                            throw error;
                        }
                        
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
                    }
                }
            } catch (error) {
                this.log('Error tracking conversion:', error.message);
                throw error;
            }
        }

        /**
         * Track conversion using image pixel fallback
         */
        trackConversionPixel(conversionData) {
            try {
                const data = this.validateConversionData(conversionData);
                
                // Add timestamp if not provided
                if (!data.triggeredAt) {
                    data.triggeredAt = Date.now();
                }

                // Create pixel URL with data as query parameters
                const params = new URLSearchParams();
                params.append('eventId', data.eventId);
                params.append('sessionId', data.sessionId);
                params.append('triggeredAt', data.triggeredAt.toString());
                
                if (data.metadata) {
                    params.append('metadata', JSON.stringify(data.metadata));
                }

                const pixelUrl = this.config.apiUrl + '?' + params.toString();
                
                // Create and load image pixel
                const img = new Image();
                img.onload = () => this.log('Pixel conversion tracked successfully');
                img.onerror = () => this.log('Pixel conversion failed');
                img.src = pixelUrl;
                
                this.log('Tracking conversion via pixel:', pixelUrl);
            } catch (error) {
                this.log('Error tracking conversion via pixel:', error.message);
                throw error;
            }
        }

        /**
         * Set configuration
         */
        configure(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.log('Configuration updated:', this.config);
        }
    }

    // Create global instance
    window.PersonaPayPixel = new PersonaPayPixel();

    // Auto-initialize with data attributes from script tag
    (function() {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        
        if (currentScript) {
            const config = {};
            
            if (currentScript.getAttribute('data-api-url')) {
                config.apiUrl = currentScript.getAttribute('data-api-url');
            }
            
            if (currentScript.getAttribute('data-debug') === 'true') {
                config.debug = true;
            }
            
            if (Object.keys(config).length > 0) {
                window.PersonaPayPixel.configure(config);
            }
        }
    })();

    // Expose additional utilities
    window.PersonaPayPixel.utils = {
        generateEventId: function() {
            return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        generateSessionId: function() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    };

})(window); 
