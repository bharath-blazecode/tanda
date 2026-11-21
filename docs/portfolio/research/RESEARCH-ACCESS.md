# Research access and provenance

Date: 22 November 2026, Australia/Brisbane.

## Retrieved technical sources

The official OWASP ASVS release requirements and relevant Cheat Sheet Series documents were fetched with HTTP 200 from `raw.githubusercontent.com`. The review also retrieved OWASP input-validation and HTTP-header guidance, plus MDN DeviceMotionEvent and reduced-motion documentation from the official MDN content repository.

The [source register](SOURCES.json) includes the exact URLs, byte counts and SHA-256 content hashes. These are technical documentation sources. They do not validate the app's physiology, clinical accuracy, regulatory status or compliance with the referenced standards.

No complete third-party source documents are redistributed in this directory. The register and memos provide citations, limited factual summaries and the product requirements they inform.

## Blocked health and journal sources

Direct HTTPS requests to the following required sources failed with proxy CONNECT 403 and curl HTTP status 000:

- NHMRC alcohol guidance.
- Australian Government standard-drinks guide.
- FSANZ caffeine information at the repository-recorded URL.
- EFSA 2015 caffeine opinion page.
- The Jongen article on PubMed Central.

This was a network policy denial. It does not establish that a page is unavailable, that a source lacks evidence or that the scientific interpretation is correct. Other study entries were inherited as research leads and were not individually retrieved.

The handoff does not call this a completed systematic review. It does not repeat study effect sizes, diagnostic correlations or sample sizes as freshly checked facts. Exact study titles, author associations, populations and protocols must be checked against the primary records before public scientific claims are expanded.

## Saved network additions

The environment draft includes these targeted destinations while preserving the package-manager preset and known custom rules:

```text
www.nhmrc.gov.au
www.health.gov.au
www.foodstandards.gov.au
www.efsa.europa.eu
pmc.ncbi.nlm.nih.gov
pubmed.ncbi.nlm.nih.gov
doi.org
www.w3.org
owasp.org
cheatsheetseries.owasp.org
developer.mozilla.org
www.oaic.gov.au
www.tga.gov.au
api.github.com
```

Saving the draft did not apply those rules to the running machine. Review and save them in environment settings where supported, then retry the affected requests. DOI redirects may require a separately identified publisher domain. Do not replace an unknown allowlist or bypass the configured proxy, authentication or TLS verification.

Git reads and authorized feature-branch pushes worked through the existing Git configuration. GitHub API requests were separately blocked. No new token was requested or extracted. If API access remains blocked, deliver a pushed branch and the exact PR creation link without claiming that a PR exists.

## Follow-up evidence checklist

1. Fetch the authoritative source and record retrieval date, revision or DOI, population, protocol and access level.
2. Confirm that the source supports the exact claim rather than only a related mechanism.
3. Separate group findings, repeatability, individual prediction and causal interpretation.
4. Label guidance by issuing authority, jurisdiction, population and dose context.
5. Preserve unknowns when a source cannot be read. Never fill missing details from a plausible-sounding citation.
6. Update the machine-readable register, the evidence matrix and the public wording together.
