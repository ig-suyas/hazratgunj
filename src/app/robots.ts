import type { MetadataRoute } from "next";
import { basePath } from "@/config/demo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [`${basePath}/`] },
  };
}
