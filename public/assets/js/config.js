/* ==========================================================================
   IGV Capital — Runtime Environment Configuration
   --------------------------------------------------------------------------
   Load this BEFORE any script that submits forms or calls a Worker:

       <script src="/assets/js/config.js"></script>

   Environment is decided by hostname. Anything that is not the production
   host is treated as staging — so localhost, staging.igvcapital.com and
   every *.pages.dev preview URL fall through to staging automatically.
   This fails in the safe direction: a misconfigured host writes to the
   staging HubSpot form, never to production.
   ========================================================================== */

(function () {
  'use strict';

  var host = window.location.hostname;

  var IS_PROD = (
    host === 'igvcapital.com' ||
    host === 'www.igvcapital.com'
  );

  window.IGV = {

    env: IS_PROD ? 'production' : 'staging',
    isProd: IS_PROD,

    /* ---- HubSpot -------------------------------------------------------
       Portal 342997618, region na3.
       The Worker builds the endpoint from portalId + formId:
       https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formId}
       Send formId from the client so one Worker codebase serves both envs.
    --------------------------------------------------------------------- */
    hubspot: {
      portalId: '342997618',
      region: 'na3',
      contactFormId: IS_PROD
        ? '314766c8-b4b1-4401-a417-fd128bef52e5'   // IGV Capital Contact — LIVE
        : '836e494f-bdbf-43d7-a110-556ecffc6805'   // IGV Capital Contact — STAGING
    },

    /* ---- Cloudflare Workers -------------------------------------------
       Replace <account> with your workers.dev subdomain, or swap these for
       custom routes once they are attached.
    --------------------------------------------------------------------- */
    workers: {
      contactVerify: IS_PROD
        ? 'https://igvcapital-contact-verify.<account>.workers.dev'
        : 'https://igvcapital-contact-verify-staging.<account>.workers.dev'
    },

    /* ---- reCAPTCHA v2 --------------------------------------------------
       Single key across both environments. staging.igvcapital.com and
       localhost must be added to this key's allowed domains in the
       reCAPTCHA admin console, or challenges will fail off-production.
       If you would rather isolate the key, make this a ternary like above.
    --------------------------------------------------------------------- */
    recaptchaSiteKey: 'YOUR-RECAPTCHA-V2-SITE-KEY'
  };

  /* ---- Staging banner --------------------------------------------------
     A visible marker so you never mistake staging for live. Injected only
     off-production; costs nothing on the real site.
  ----------------------------------------------------------------------- */
  if (!IS_PROD) {
    console.info(
      '[IGV] STAGING — form submissions go to the staging HubSpot form ' +
      '(836e494f…), not to live.'
    );

    document.addEventListener('DOMContentLoaded', function () {
      var bar = document.createElement('div');
      bar.textContent = 'STAGING — ' + host;
      bar.setAttribute('data-igv-env-banner', '');
      bar.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'right:0',
        'z-index:99999',
        'background:#952944',          /* IGV Capital Magenta */
        'color:#FFFDF3',               /* IGV Capital Off White */
        'font:600 11px/1 Montserrat, system-ui, sans-serif',
        'letter-spacing:.08em',
        'text-transform:uppercase',
        'text-align:center',
        'padding:6px 8px',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(bar);
    });
  }
})();
