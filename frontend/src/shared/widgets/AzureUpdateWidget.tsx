import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';

import { API_BASE_URL } from '../../constants';

interface Update {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export const icon = <Newspaper className="h-6 w-6 text-[var(--accent-primary)]" />;

export default function AzureUpdateWidget() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const rssUrl =
          `${API_BASE_URL}/dashboard/rssproxy?rssUrl=` +
          encodeURIComponent('https://www.microsoft.com/releasecommunications/api/v2/azure/rss');

        const res = await fetch(rssUrl);
        const xmlText = await res.text();
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

        const items: Update[] = Array.from(doc.querySelectorAll('item')).map((item) => ({
          title: item.querySelector('title')?.textContent || '',
          link: item.querySelector('link')?.textContent || '',
          pubDate: item.querySelector('pubDate')?.textContent || '',
          description: item.querySelector('description')?.textContent || '',
        }));

        setUpdates(items);
      } catch (error) {
        console.error('Failed to fetch Azure updates:', error);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-4 ui-text-muted">Loading latest Azure services...</div>;
  }

  return (
    <ul className="space-y-4">
      {updates.slice(0, 10).map((update, index) => (
        <li
          key={index}
          className="ui-panel rounded-xl p-4 transition-shadow hover:shadow-[var(--shadow-panel)]"
        >
          <a
            href={update.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent-primary)] hover:underline"
          >
            {update.title}
          </a>
          <div className="mt-1 text-xs ui-text-muted">{new Date(update.pubDate).toLocaleDateString()}</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{update.description}</p>
        </li>
      ))}
    </ul>
  );
}
