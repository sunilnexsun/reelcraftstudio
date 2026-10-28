/*!
 * ReelCraft Studio — website forms (no build step, no dependencies)
 *
 *   <script src="https://YOUR-ADMIN-DOMAIN/embed/reelcraft-forms.js"
 *           data-supabase-url="https://YOUR-PROJECT.supabase.co"
 *           data-supabase-key="YOUR_PUBLISHABLE_KEY" defer></script>
 *   <div data-reelcraft-form="enquiry"></div>
 *   <div data-reelcraft-form="booking"></div>
 *
 * Calls the public RPCs submit_enquiry / submit_booking_request. Those functions validate input,
 * drop bots (honeypot), rate-limit per IP and de-duplicate, so the publishable key is safe here:
 * anonymous visitors cannot read any admin data.
 */
(function () {
  'use strict'
  var script = document.currentScript
  var URL_ = script && script.getAttribute('data-supabase-url')
  var KEY = script && script.getAttribute('data-supabase-key')
  if (!URL_ || !KEY) { console.warn('[reelcraft-forms] data-supabase-url and data-supabase-key are required'); return }

  var css = '.rcf{font:15px/1.5 Inter,system-ui,sans-serif;color:inherit;display:grid;gap:12px}.rcf label{display:grid;gap:4px;font-weight:600;font-size:13px}' +
    '.rcf input,.rcf select,.rcf textarea{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #3a3a3a;background:#1f1f1f;color:#fff}' +
    '.rcf textarea{min-height:90px}.rcf button{font:inherit;font-weight:700;padding:12px 16px;border:0;border-radius:10px;background:#FF1744;color:#fff;cursor:pointer}' +
    '.rcf button[disabled]{opacity:.6;cursor:progress}.rcf .rcf-msg{padding:10px 12px;border-radius:10px;font-size:14px}.rcf .rcf-ok{background:rgba(34,197,94,.12);color:#86efac}' +
    '.rcf .rcf-err{background:rgba(239,68,68,.12);color:#fca5a5}.rcf .rcf-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.rcf .rcf-row{display:grid;gap:12px;grid-template-columns:1fr 1fr}'
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style)

  function rpc(fn, body) {
    return fetch(URL_ + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {} }).then(function (j) {
        if (!r.ok) throw new Error((j && j.message) || 'Something went wrong. Please try again or WhatsApp us.')
        return j
      })
    })
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function val(f, n) { var v = f.elements[n] && f.elements[n].value; return v && v.trim() ? v.trim() : null }
  function istISO(date, time) { return new Date(date + 'T' + time + ':00+05:30').toISOString() }

  function mount(node, kind, services) {
    var f = el(kind === 'booking'
      ? '<form class="rcf" novalidate>' +
        '<label>Your name *<input name="name" required maxlength="120" autocomplete="name"></label>' +
        '<div class="rcf-row"><label>Phone / WhatsApp *<input name="phone" type="tel" required autocomplete="tel"></label><label>Email<input name="email" type="email" autocomplete="email"></label></div>' +
        '<div class="rcf-row"><label>Preferred date *<input name="date" type="date" required></label><label>Start time *<input name="time" type="time" value="10:00" required></label></div>' +
        '<div class="rcf-row"><label>Shoot type<select name="type"><option>Promo shoot</option><option>Reels shoot</option><option>Product shoot</option><option>Brand film</option><option>Event coverage</option><option>Photography</option></select></label>' +
        '<label>Hours<select name="hours"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>6</option><option>8</option></select></label></div>' +
        '<label>Location<input name="location" maxlength="300"></label><label>Message<textarea name="message" maxlength="2000"></textarea></label>' +
        '<div class="rcf-hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="rcf-msg" role="status" hidden></div><button type="submit">Request this date</button></form>'
      : '<form class="rcf" novalidate>' +
        '<div class="rcf-row"><label>Your name *<input name="name" required maxlength="120" autocomplete="name"></label><label>Business<input name="business" maxlength="120"></label></div>' +
        '<div class="rcf-row"><label>Phone / WhatsApp<input name="phone" type="tel" autocomplete="tel"></label><label>Email<input name="email" type="email" autocomplete="email"></label></div>' +
        '<div class="rcf-row"><label>Service<select name="service"><option value="">Not sure yet</option>' +
        services.map(function (s) { return '<option value="' + esc(s.slug) + '">' + esc(s.title) + '</option>' }).join('') +
        '</select></label><label>Budget (₹)<input name="budget" inputmode="decimal"></label></div>' +
        '<label>Tell us about the project<textarea name="message" maxlength="2000"></textarea></label>' +
        '<div class="rcf-hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="rcf-msg" role="status" hidden></div><button type="submit">Send enquiry</button></form>')
    node.appendChild(f)
    var msg = f.querySelector('.rcf-msg'), btn = f.querySelector('button')
    function show(ok, text) { msg.hidden = false; msg.className = 'rcf-msg ' + (ok ? 'rcf-ok' : 'rcf-err'); msg.textContent = text }

    f.addEventListener('submit', function (e) {
      e.preventDefault()
      if (btn.disabled) return // guard against double submits
      var name = val(f, 'name'), phone = val(f, 'phone'), email = val(f, 'email')
      if (!name || name.length < 2) return show(false, 'Please enter your name.')
      if (kind === 'booking' && !phone) return show(false, 'Please enter your phone number.')
      if (!phone && !email) return show(false, 'Please enter a phone number or email.')
      var call
      if (kind === 'booking') {
        var d = val(f, 'date'), t = val(f, 'time')
        if (!d || !t) return show(false, 'Please choose a date and time.')
        call = rpc('submit_booking_request', { p_name: name, p_phone: phone, p_email: email, p_shoot_type: val(f, 'type'), p_preferred_start: istISO(d, t),
          p_duration_hours: Number(val(f, 'hours') || 2), p_location: val(f, 'location'), p_message: val(f, 'message'), p_website: val(f, 'website') })
      } else {
        var b = val(f, 'budget')
        if (b && !/^\d+(\.\d{1,2})?$/.test(b.replace(/,/g, ''))) return show(false, 'Please enter the budget as a number.')
        call = rpc('submit_enquiry', { p_name: name, p_phone: phone, p_email: email, p_business: val(f, 'business'), p_service_slug: val(f, 'service'),
          p_budget: b ? Number(b.replace(/,/g, '')) : null, p_message: val(f, 'message'), p_website: val(f, 'website') })
      }
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…'; msg.hidden = true
      call.then(function (r) {
        f.reset()
        show(true, r && r.duplicate ? 'We already have your request — no need to send it again. We’ll be in touch soon.'
          : kind === 'booking' ? 'Request received! We’ll confirm the date and crew with you shortly.' : 'Thanks! Our team will call or WhatsApp you soon.')
      }).catch(function (err) { show(false, err.message) })
        .then(function () { btn.disabled = false; btn.textContent = label })
    })
  }

  function init() {
    var nodes = document.querySelectorAll('[data-reelcraft-form]')
    if (!nodes.length) return
    fetch(URL_ + '/rest/v1/services?select=title,slug&is_active=eq.true&order=sort_order', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.ok ? r.json() : [] }).catch(function () { return [] })
      .then(function (services) { nodes.forEach(function (n) { if (!n.dataset.rcfMounted) { n.dataset.rcfMounted = '1'; mount(n, n.getAttribute('data-reelcraft-form'), services || []) } }) })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init()
})()
