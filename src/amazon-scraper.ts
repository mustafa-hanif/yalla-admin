import * as cheerio from "cheerio";
import type { Product } from "./lib/types";

export class AmazonScraper {
  baseUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseUrl = "https://www.amazon.ae";
    // You should set these environment variables or pass them as constructor parameters
    this.username = process.env.OXYLABS_USERNAME || "YOUR_USERNAME";
    this.password = process.env.OXYLABS_PASSWORD || "YOUR_PASSWORD";
  }

  async scrapeProducts(keyword: string, maxResults = 10) {
    try {
      // Construct search URL
      const searchUrl = `${this.baseUrl}/s?k=${encodeURIComponent(keyword)}`;
      console.log(`Searching for: ${keyword}`);
      console.log(`URL: ${searchUrl}`);

      // Prepare Oxylabs request body
      const body = {
        source: "amazon",
        geo_location: "United Arab Emirates",
        user_agent_type: "desktop_chrome",
        url: searchUrl,
      };

      console.log(this.username, this.password);
      // Fetch HTML content via Oxylabs API
      const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
        method: "post",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${this.username}:${this.password}`).toString("base64"),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await response.json();

      // Extract HTML content from the API response
      const html = apiResponse.results?.[0]?.content || "";

      if (!html) {
        console.log("No HTML content received from Oxylabs API");
        return [];
      }

      console.log(`Received HTML content (${html.length} characters)`);

      // Parse HTML with Cheerio
      const $ = cheerio.load(html);

      // Find product elements
      const productElements = $('[data-component-type="s-search-result"]');
      const results: Product[] = [];

      if (productElements.length === 0) {
        console.log("No search results found or page structure changed");
        return [];
      }

      // Extract product data
      productElements.each((i, element) => {
        if (i >= maxResults) return false; // Break the loop

        try {
          const $element = $(element);

          // Extract title
          const titleElement = $element
            .find('h2 a span, [data-cy="title-recipe-title"], h2 span')
            .first();
          const title = titleElement.text().trim() || "N/A";

          // Extract price
          const priceElement = $element
            .find(
              '.a-price-whole, .a-price .a-offscreen, [data-a-color="price"] .a-offscreen'
            )
            .first();
          let price = "N/A";
          if (priceElement.length) {
            price = priceElement
              .text()
              .trim()
              .replace(/[^\d.,]/g, "");
          }

          // Extract rating
          const ratingElement = $element
            .find('[aria-label*="out of"], .a-icon-alt')
            .first();
          let rating = "N/A";
          if (ratingElement.length) {
            const ratingText =
              ratingElement.attr("aria-label") || ratingElement.text();
            const ratingMatch = ratingText?.match(/(\d+\.?\d*)\s*out of/);
            rating = ratingMatch ? ratingMatch[1] : "N/A";
          }

          // Extract image URL
          const imageElement = $element.find("img").first();
          const image = imageElement.attr("src") || "N/A";

          // Extract product URL
          const linkElement = $element
            .find('h2 a, [aria-describedby="price-link"]')
            .first();
          let url = "N/A";
          if (linkElement.length) {
            const href = linkElement.attr("href");
            url = href ? `https://amazon.ae${href}` : "N/A";
          }

          // Extract review count
          const reviewElement = $element
            .find('[aria-label*="ratings"], a[href*="#customerReviews"]')
            .first();
          let reviewCount = "N/A";
          if (reviewElement.length) {
            const reviewText =
              reviewElement.text() || reviewElement.attr("aria-label");
            const reviewMatch = reviewText?.match(/(\d+,?\d*)/);
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
          console.log("Error parsing product:", (error as Error).message);
        }
      });

      console.log(`Found ${results.length} products`);
      return results;
    } catch (error) {
      console.error("Scraping error:", (error as Error).message);
      return [];
    }
  }
}

export async function searchAmazon(keyword: string, maxResults = 10) {
  const scraper = new AmazonScraper();
  const products: Product[] = await scraper.scrapeProducts(keyword, maxResults);

  return {
    keyword,
    totalResults: products.length,
    timestamp: new Date().toISOString(),
    products,
  };
}
