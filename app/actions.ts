"use server";

import metascraper from "metascraper";
import metascraperTitle from "metascraper-title";

const scraper = metascraper([metascraperTitle()]);

export async function getServerTime() {
  return {
    server_time: new Date().toISOString(),
  };
}

export async function getPageMetadata(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const metadata = await scraper({ html, url: url });
  return metadata;
}
