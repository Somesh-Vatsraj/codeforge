      <div className="widget">
        <h3 className="widget__title">Follow Us</h3>
        <div className="follow-grid">
          <a
            className="follow-btn follow-btn--fb"
            href={settings.social_facebook || '#facebook'}
            target={settings.social_facebook ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <span className="follow-btn__icon">f</span>
            <span className="follow-btn__count">4,000 Fans</span>
          </a>
          <a
            className="follow-btn follow-btn--ig"
            href={settings.social_twitter || '#instagram'}
            target={settings.social_twitter ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <span className="follow-btn__icon">◉</span>
            <span className="follow-btn__count">30,000 Followers</span>
          </a>
          <a
            className="follow-btn follow-btn--yt"
            href={settings.social_youtube || '#youtube'}
            target={settings.social_youtube ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <span className="follow-btn__icon">▶</span>
            <span className="follow-btn__count">200,000 Subs</span>
          </a>
        </div>
      </div>
