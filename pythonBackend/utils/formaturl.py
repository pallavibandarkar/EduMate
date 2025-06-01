def format_url_display(url, max_length=50):
    """Format URL for display by shortening if needed."""
    if len(url) > max_length:
        # Keep the domain and truncate the path
        domain = url.split('//')[-1].split('/')[0]
        return f"{domain}/...{url[-20:]}"
    return url
