/**
 * TnRationCard.jsx
 *
 * Renders BOTH sides of the Tamil Nadu Smart Ration Card:
 *   Front — header, photo, card holder details, barcode number
 *   Back  — family members list, QR code placeholder, TNPDS links
 *           (matches the physical card back shown in the specimen image)
 *
 * Props:
 *   card — RationCard document (populated with .user)
 */

import { useState } from 'react';
import { FiUser, FiRotateCw } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';

const CARD_TYPE_META = {
  PHH:  { label: 'Priority Household',     color: '#1a6b3c', bg: '#e8f5ed' },
  AAY:  { label: 'Antyodaya Anna Yojana',  color: '#b45309', bg: '#fdf3dc' },
  NPHH: { label: 'Non-Priority Household', color: '#1a4a8c', bg: '#e8eef8' },
  APL:  { label: 'Above Poverty Line',     color: '#7c3aed', bg: '#ede9fe' },
};

// ── QR Code placeholder (SVG pattern mimicking a QR) ─────────────
function QRPlaceholder({ rcn }) {
  // Build a simple deterministic pixel grid from the card number
  const size = 9;
  const cells = [];
  const seed = rcn || 'TN00000000';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // always-dark corner finders
      const inFinder =
        (r < 3 && c < 3) ||
        (r < 3 && c >= size - 3) ||
        (r >= size - 3 && c < 3);
      const charCode = seed.charCodeAt((r * size + c) % seed.length) || 65;
      const dark = inFinder || ((charCode + r + c) % 3 !== 0);
      cells.push({ r, c, dark });
    }
  }
  const cell = 7; // px per cell
  const dim  = size * cell;
  return (
    <svg width={dim} height={dim} style={{ display: 'block' }}>
      <rect width={dim} height={dim} fill="#fff" />
      {cells.map(({ r, c, dark }) =>
        dark ? (
          <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#1a202c" />
        ) : null
      )}
    </svg>
  );
}

// ── FRONT SIDE ────────────────────────────────────────────────────
function CardFront({ card }) {
  const ct     = CARD_TYPE_META[card.cardType] || CARD_TYPE_META.PHH;
  const user   = card.user || {};
  // Fallback: card.rationCardNumber first, then user.rationCardNumber
  const rcn    = card.rationCardNumber || user.rationCardNumber || '';
  const dobStr = card.dob
    ? new Date(card.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <>
      {/* TN Govt Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1a6b3c 0%,#2d8a52 100%)',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, border: '2px solid rgba(255,255,255,.35)',
          }}>🌾</div>
          <div>
            <div style={{ color: '#fff', fontSize: 9, opacity: .82, letterSpacing: '.4px' }}>தமிழ்நாடு அரசு</div>
            <div style={{ color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px' }}>GOVERNMENT OF TAMIL NADU</div>
            <div style={{ color: 'rgba(255,255,255,.68)', fontSize: 8.5, letterSpacing: '.2px' }}>CIVIL SUPPLIES &amp; CONSUMER PROTECTION DEPT.</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ background: ct.bg, color: ct.color, padding: '2px 9px', borderRadius: 5, fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>
            {card.cardType}
          </div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 8, marginTop: 3 }}>{ct.label}</div>
        </div>
      </div>

      {/* Gold title strip */}
      <div style={{ background: '#c8930a', textAlign: 'center', padding: '4px', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '2px' }}>
        குடும்ப அட்டை / FAMILY CARD
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: 14, background: '#fffef9' }}>
        {/* Photo + number */}
        <div style={{ flexShrink: 0 }}>
          {/* Photo */}
          <div style={{
            width: 76, height: 86,
            border: '2px solid #1a6b3c', borderRadius: 5, overflow: 'hidden',
            background: '#f7f8fa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#9ca3af',
          }}>
            {card.photo
              ? <img src={card.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <FiUser />}
          </div>
          {/* Ration Card Number — shown clearly below photo */}
          <div style={{
            marginTop: 5,
            background: '#1a6b3c',
            borderRadius: '4px 4px 0 0',
            padding: '3px 4px',
            textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 7, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>
              Card No.
            </div>
          </div>
          <div style={{
            background: '#1a202c',
            borderRadius: '0 0 4px 4px',
            padding: '3px 4px',
            textAlign: 'center',
            minWidth: 76,
          }}>
            <div style={{
              color: '#fff',
              fontSize: rcn.length > 10 ? 7 : 8,
              fontWeight: 800,
              letterSpacing: '0.5px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              lineHeight: 1.3,
            }}>
              {rcn || '—'}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          {[
            { label: 'குடும்பத் தலைவரின் பெயர்:', value: user.name || '—' },
            { label: 'பிறந்த தேதி / Date of Birth:', value: dobStr },
            { label: 'முகவரி / Address:', value: card.address },
            { label: 'Phone:', value: user.phone || '—' },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: 6, borderBottom: i < 3 ? '1px dashed #e2e8f0' : 'none', paddingBottom: 4 }}>
              <div style={{ fontSize: 8.5, color: '#4a5568', letterSpacing: '.3px' }}>{row.label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1a202c', marginTop: 1 }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px' }}>
        <span style={{ color: '#fff', fontSize: 9.5, fontWeight: 700 }}>Smart Ration Card</span>
        <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 9.5 }}>Members: {card.familyMembers?.length ?? 0}</span>
        <MdVerified color="#fff" size={14} />
      </div>
    </>
  );
}

// ── BACK SIDE ─────────────────────────────────────────────────────
function CardBack({ card }) {
  const members = card.familyMembers || [];
  const rcn     = card.rationCardNumber || card.user?.rationCardNumber || '';

  return (
    <>
      {/* Back header — matches physical card green top bar */}
      <div style={{
        background: 'linear-gradient(135deg,#1a6b3c 0%,#2d8a52 100%)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '.5px' }}>
            குடும்ப உறுப்பினர்கள் — {members.length}
          </div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 8.5 }}>
            பொது விநியோகத் திட்ட இ-சேவைகள்
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 8.5, textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>TNPDS</div>
          <div>Public Distribution</div>
        </div>
      </div>

      {/* Main back body */}
      <div style={{ display: 'flex', gap: 0, background: '#f8fdf9', minHeight: 160 }}>

        {/* Left — family members list */}
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px dashed #c6e6d0' }}>
          {members.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 11, paddingTop: 8 }}>No members added</div>
          ) : (
            members.map((m, i) => (
              <div key={m._id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: m.isHead ? '#1a6b3c' : '#2d8a52',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, color: '#1a202c', fontWeight: m.isHead ? 700 : 400 }}>
                  {m.name}
                </span>
                {m.isHead && (
                  <span style={{ fontSize: 8, color: '#fff', background: '#1a6b3c', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                    HEAD
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right — QR + services */}
        <div style={{ width: 160, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ border: '2px solid #1a6b3c', borderRadius: 4, padding: 4, background: '#fff' }}>
              <QRPlaceholder rcn={rcn} />
            </div>
          </div>

          {/* Services list — matching physical card back */}
          <div style={{ fontSize: 8, color: '#374151', lineHeight: 1.7 }}>
            {[
              'புதிய அட்டை விண்ணப்பிக்க',
              'பெயர் சேர்த்தல் / நீக்கல்',
              'விற்பனை விவரங்கள்',
              'புகார் / கருத்து பதிவு',
              'பிற தகவல்கள்',
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#1a6b3c', fontWeight: 700 }}>●</span> {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back footer — TNPDS links matching physical card */}
      <div style={{
        background: '#1a6b3c',
        padding: '7px 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4, alignItems: 'center',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 7.5, marginBottom: 1 }}>🌐 வலைதளம்</div>
          <div style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>tnpds.gov.in</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,.2)', borderRight: '1px solid rgba(255,255,255,.2)', padding: '0 6px' }}>
          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 7.5, marginBottom: 1 }}>📞 இலவச உதவி மைய எண்</div>
          <div style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>1967 / 1800-425-5901</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 7.5, marginBottom: 1 }}>📱 TNPDS கைபேசி செயலி</div>
          <div style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>Google Play / App Store</div>
        </div>
      </div>

      {/* Disclaimer — matching physical card bottom text */}
      <div style={{ background: '#f0faf4', padding: '5px 14px', borderTop: '1px solid #c6e6d0' }}>
        <p style={{ fontSize: 7.5, color: '#374151', margin: 0, textAlign: 'center' }}>
          * குறிப்பு: இந்த அட்டை காணாமல் போனால், நகல் அட்டை பெற இ-சேவை மையத்தை தொடர்பு கொள்ளவும்
        </p>
        <p style={{ fontSize: 7.5, color: '#6b7280', margin: '3px 0 0', textAlign: 'center' }}>
          * பொறுப்பாகாமை: முகவரியின் உண்மை தன்மைக்கு முடிவான சான்று இதுவல்ல &nbsp;|&nbsp; * மாற்றத்தக்கதன்று
        </p>
      </div>
    </>
  );
}

// ── MAIN COMPONENT — flip toggle ──────────────────────────────────
export default function TnRationCard({ card }) {
  const [showBack, setShowBack] = useState(false);

  if (!card) return null;

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Flip button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={() => setShowBack(b => !b)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent',
            border: '1.5px solid #1a6b3c',
            color: '#1a6b3c', borderRadius: 8,
            padding: '5px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <FiRotateCw size={13} />
          {showBack ? 'Show Front' : 'Show Back'}
        </button>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(26,107,60,.18)',
        border: '2px solid #1a6b3c',
        fontFamily: "'Georgia', serif",
        userSelect: 'none',
      }}>
        {showBack ? <CardBack card={card} /> : <CardFront card={card} />}
      </div>

      {/* Side label */}
      <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: '#6b7280' }}>
        {showBack ? '← Back side' : 'Front side →'}
      </div>
    </div>
  );
}