import { Router } from "express";

const router = Router();

router.get("/search", async (req, res) => {
  const apiKey = process.env["BRAVE_SEARCH_API_KEY"];

  if (!apiKey) {
    res.status(503).json({
      error: "BRAVE_SEARCH_API_KEY not configured",
      setup: true,
    });
    return;
  }

  const query = (req.query["q"] as string | undefined)?.trim();
  const count = Math.min(Number(req.query["count"]) || 6, 10);

  if (!query) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));

    const upstream = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      req.log.error({ status: upstream.status, body }, "Brave Search API error");
      res.status(upstream.status).json({ error: "Search API returned an error" });
      return;
    }

    const data = (await upstream.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          age?: string;
          meta_url?: { favicon?: string };
        }>;
      };
    };

    const results = (data.web?.results ?? []).map((r, i) => ({
      index: i + 1,
      title: r.title ?? "",
      url: r.url ?? "",
      description: r.description ?? "",
      age: r.age ?? "",
      favicon: r.meta_url?.favicon ?? "",
    }));

    res.json({ results, query });
  } catch (err) {
    req.log.error({ err }, "Brave Search fetch failed");
    res.status(500).json({ error: "Search request failed" });
  }
});

export default router;
