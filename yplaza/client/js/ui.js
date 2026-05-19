function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString('fr-FR')} €`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

const PROPERTY_IMAGE_BASE = './assets/properties/';
const PROPERTY_IMAGE_FALLBACK = `${PROPERTY_IMAGE_BASE}p2.jpg`;

function propertyAssetImage(index) {
  return `${PROPERTY_IMAGE_BASE}p${index}.jpg`;
}

function normalizeImageUrl(url) {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('./') ||
    url.startsWith('../')
  ) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

function normalizePropertyImageText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildPropertyImageText(property) {
  const values = [
    property.title,
    property.type,
    property.description,
    property.category,
    property.subtype,
    property.property_type,
    property.propertyType,
    property.kind,
    Array.isArray(property.tags) ? property.tags.join(' ') : property.tags,
    Array.isArray(property.keywords) ? property.keywords.join(' ') : property.keywords,
  ];

  return values.map(normalizePropertyImageText).filter(Boolean).join(' ');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textIncludesAny(text, keywords) {
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizePropertyImageText(keyword);
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`
    );

    return pattern.test(text);
  });
}

function getHouseInteriorImage(property, text) {
  const images = [3, 7, 9];
  const id = Number(property.id);

  if (!Number.isNaN(id) && id > 0) {
    return propertyAssetImage(images[(id - 1) % images.length]);
  }

  const score = text
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return propertyAssetImage(images[score % images.length]);
}

function getKeywordPropertyImage(property) {
  const text = buildPropertyImageText(property);
  if (!text) return PROPERTY_IMAGE_FALLBACK;

  const isApartment = textIncludesAny(text, [
    'appartement',
    'appartements',
    'studio',
    'studios',
    'duplex',
    't1',
    't2',
    't3',
  ]);
  const isHouse = textIncludesAny(text, [
    'maison',
    'maisons',
    'villa',
    'villas',
    'pavillon',
    'pavillons',
  ]);
  const hasInteriorCue = textIncludesAny(text, [
    'interieur',
    'interieurs',
    'salon',
    'sejour',
    'cuisine',
    'chambre',
    'chambres',
    'suite parentale',
  ]);

  if (
    textIncludesAny(text, ['villa']) ||
    (isHouse &&
      textIncludesAny(text, [
        'piscine',
        'haut de gamme',
        'luxe',
        'prestige',
        'standing',
        'premium',
      ]))
  ) {
    return propertyAssetImage(6);
  }

  if (
    textIncludesAny(text, [
      'immeuble',
      'batiment',
      'batiments',
      'local',
      'locaux',
      'bureau',
      'bureaux',
      'commerce',
      'commercial',
      'commerciale',
      'commerciaux',
      'professionnel',
      'professionnelle',
      'tertiaire',
      'entrepot',
      'atelier',
    ])
  ) {
    return propertyAssetImage(4);
  }

  if (textIncludesAny(text, ['loft', 'lofts', 'industriel', 'industrielle'])) {
    return propertyAssetImage(4);
  }

  if (textIncludesAny(text, ['atypique'])) {
    return isApartment ? propertyAssetImage(5) : propertyAssetImage(4);
  }

  if (isApartment) {
    if (hasInteriorCue) return propertyAssetImage(5);
    if (
      textIncludesAny(text, [
        'studio',
        'studios',
        'duplex',
        't1',
        't2',
        'petit',
        'compact',
        'compacte',
        'etudiant',
        'etudiante',
      ])
    ) {
      return propertyAssetImage(1);
    }

    return propertyAssetImage(2);
  }

  if (isHouse) {
    if (
      hasInteriorCue &&
      !textIncludesAny(text, [
        'jardin',
        'terrain',
        'terrasse',
        'garage',
        'exterieur',
        'exterieure',
        'exterieurs',
      ])
    ) {
      return getHouseInteriorImage(property, text);
    }

    return propertyAssetImage(8);
  }

  if (hasInteriorCue) return propertyAssetImage(5);

  return PROPERTY_IMAGE_FALLBACK;
}

function getPropertyImage(property) {
  return getPropertyImages(property)[0];
}

function getPropertyImages(property) {
  const images = [];
  if (Array.isArray(property.images)) {
    property.images
      .slice()
      .sort((a, b) => {
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        return Number(a.sort_order || 0) - Number(b.sort_order || 0);
      })
      .forEach((image) => {
        const url = normalizeImageUrl(image.image_url || image.url);
        if (url) images.push(url);
      });
  }

  const mainImage = normalizeImageUrl(property.main_image_url);
  if (mainImage && !images.includes(mainImage)) {
    images.unshift(mainImage);
  }

  if (!images.length) {
    images.push(getKeywordPropertyImage(property));
  }

  return images;
}

function getStatusLabel(status) {
  const labels = {
    draft: 'Brouillon',
    published: 'Publiée',
    available: 'Publiée',
    sold: 'Vendue',
    archived: 'Archivée',
  };
  return labels[status] || status || '—';
}

function normalizeOfferValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getOfferLabel(property) {
  const valuesToCheck = [
    property.offer_type,
    property.offerType,
    property.transaction_type,
    property.transactionType,
    property.transaction,
    property.listing_type,
    property.listingType,
    property.operation,
    property.purpose,
    property.mode,
    property.category,
  ]
    .map(normalizeOfferValue)
    .filter(Boolean);

  const buyTokens = ['buy', 'sale', 'sell', 'vente', 'acheter', 'a-vendre'];
  const rentTokens = ['rent', 'rental', 'location', 'louer', 'a-louer'];

  if (valuesToCheck.some((v) => buyTokens.some((token) => v.includes(token)))) {
    return 'À vendre';
  }

  if (valuesToCheck.some((v) => rentTokens.some((token) => v.includes(token)))) {
    return 'À louer';
  }

  return 'Disponible';
}

function createPropertyCard(property) {
  const link = `./property.html?id=${encodeURIComponent(property.id)}`;
  const images = getPropertyImages(property);
  const offerLabel = getOfferLabel(property);

  const city = property.city || 'Ville non renseignée';
  const surface = property.surface ?? property.area ?? '—';
  const rooms = property.rooms ?? property.nb_rooms ?? property.pieces ?? '—';
  const type = property.type || 'Bien immobilier';
  const views = property.views_count ?? 0;
  const agency = property.agency_name
    ? `${property.agency_name}${property.agency_city ? ` • ${property.agency_city}` : ''}`
    : null;

  const div = document.createElement('article');
  div.className = 'property-card';

  div.innerHTML = `
    <div class="property-media-shell" data-index="0">
      <div class="property-price">${formatPrice(property.price)}</div>
      <div class="badge-offer">${offerLabel}</div>
      <a href="${link}" class="property-media-link" aria-label="Voir le détail de ${property.title}">
        <div class="property-media" style="background-image: url('${images[0]}');"></div>
      </a>
      ${
        images.length > 1
          ? `
            <button class="card-carousel-btn card-carousel-btn--prev" type="button" data-dir="-1" aria-label="Image précédente">&lsaquo;</button>
            <button class="card-carousel-btn card-carousel-btn--next" type="button" data-dir="1" aria-label="Image suivante">&rsaquo;</button>
            <div class="card-carousel-count">1/${images.length}</div>
          `
          : ''
      }
    </div>

    <div class="property-body">
      <div class="property-sub">${type}</div>

      <h3 class="property-title">
        <a href="${link}">${property.title}</a>
      </h3>

      <div class="property-meta">
        ${city} • ${surface} m² • ${rooms} pièce${Number(rooms) > 1 ? 's' : ''}
      </div>

      ${
        agency
          ? `<div class="property-meta">${agency}</div>`
          : ''
      }
    </div>

    <footer class="property-footer">
      <p class="small">Créé le ${formatDate(property.created_at)}</p>
      <a class="btn btn-primary" href="${link}">Voir le détail</a>
    </footer>
  `;

  const mediaShell = div.querySelector('.property-media-shell');
  const media = div.querySelector('.property-media');
  const counter = div.querySelector('.card-carousel-count');
  const buttons = div.querySelectorAll('.card-carousel-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = Number(mediaShell.dataset.index || 0);
      const dir = Number(button.dataset.dir || 1);
      const next = (current + dir + images.length) % images.length;
      mediaShell.dataset.index = String(next);
      media.style.backgroundImage = `url('${images[next]}')`;
      if (counter) counter.textContent = `${next + 1}/${images.length}`;
    });
  });

  return div;
}

function renderPropertyList(container, properties) {
  container.innerHTML = '';

  if (!properties || properties.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <h3>Aucun bien trouvé</h3>
      <p>Essayez de modifier vos critères de recherche.</p>
    `;
    container.appendChild(empty);
    return;
  }

  properties.forEach((property) => {
    container.appendChild(createPropertyCard(property));
  });
}

function showError(element, message) {
  if (!element) return;
  element.style.display = 'block';
  element.textContent = message;
}

function hideError(element) {
  if (!element) return;
  element.style.display = 'none';
  element.textContent = '';
}
