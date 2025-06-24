import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Product } from "./lib/types";

puppeteer.use(StealthPlugin());

export class AmazonScraper {
  baseUrl: string;
  constructor() {
    this.baseUrl = "https://www.amazon.ae";
  }

  async scrapeProducts(keyword, maxResults = 10) {
    let browser;

    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Navigate to Amazon.ae search
      const searchUrl = `${this.baseUrl}/s?k=${encodeURIComponent(keyword)}`;
      console.log(`Searching for: ${keyword}`);
      console.log(`URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for search results to load
      try {
        await page.waitForSelector('[data-component-type="s-search-result"]', {
          timeout: 10000,
        });
      } catch (error) {
        console.log(JSON.stringify(error));
        console.log("No search results found or page structure changed");
        return [];
      }

      // Extract product data
      const products = await page.evaluate((maxResults) => {
        const productElements = document.querySelectorAll(
          '[data-component-type="s-search-result"]'
        );
        const results = [];

        for (let i = 0; i < Math.min(productElements.length, maxResults); i++) {
          const element = productElements[i];

          try {
            // Extract title
            const titleElement =
              element.querySelector("h2 a span") ||
              element.querySelector('[data-cy="title-recipe-title"]') ||
              element.querySelector("h2 span");
            const title = titleElement
              ? titleElement.textContent.trim()
              : "N/A";

            // Extract price
            const priceElement =
              element.querySelector(".a-price-whole") ||
              element.querySelector(".a-price .a-offscreen") ||
              element.querySelector('[data-a-color="price"] .a-offscreen');
            let price = "N/A";
            if (priceElement) {
              price = priceElement.textContent.trim().replace(/[^\d.,]/g, "");
            }

            // Extract rating
            const ratingElement =
              element.querySelector('[aria-label*="out of"]') ||
              element.querySelector(".a-icon-alt");
            let rating = "N/A";
            if (ratingElement) {
              const ratingText =
                ratingElement.getAttribute("aria-label") ||
                ratingElement.textContent;
              const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*out of/);
              rating = ratingMatch ? ratingMatch[1] : "N/A";
            }

            // Extract image URL
            const imageElement = element.querySelector("img");
            const image = imageElement ? imageElement.src : "N/A";

            // Extract product URL
            const linkElement =
              element.querySelector("h2 a") ||
              element.querySelector('[aria-describedby="price-link"]');
            let url = "N/A";
            if (linkElement) {
              const href = linkElement.getAttribute("href");
              url = `https://amazon.ae${href}`;
            }

            // Extract review count
            const reviewElement =
              element.querySelector('[aria-label*="ratings"]') ||
              element.querySelector('a[href*="#customerReviews"]');
            let reviewCount = "N/A";
            if (reviewElement) {
              const reviewText =
                reviewElement.textContent ||
                reviewElement.getAttribute("aria-label");
              const reviewMatch = reviewText.match(/(\d+,?\d*)/);
              reviewCount = reviewMatch ? reviewMatch[1] : "N/A";
            }

            if (title !== "N/A") {
              results.push({
                title,
                price,
                rating,
                reviewCount,
                image,
                url,
              });
            }
          } catch (error) {
            console.log("Error parsing product:", error.message);
          }
        }

        return results;
      }, maxResults);

      console.log(`Found ${products.length} products`);
      return products;
    } catch (error) {
      console.error("Scraping error:", error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export async function searchAmazon(keyword, maxResults = 10) {
  const scraper = new AmazonScraper();
  const products: Product[] = await scraper.scrapeProducts(keyword, maxResults);

  return {
    keyword,
    totalResults: products.length,
    timestamp: new Date().toISOString(),
    products,
  };
}
