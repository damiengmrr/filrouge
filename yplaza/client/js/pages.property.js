document.addEventListener('DOMContentLoaded', async () => {
  const errorBox = document.getElementById('property-error');
  const successBox = document.getElementById('property-success');

  const galleryImage = document.getElementById('property-gallery-image');
  const galleryThumbs = document.getElementById('gallery-thumbs');
  const galleryPrev = document.getElementById('gallery-prev');
  const galleryNext = document.getElementById('gallery-next');
  const galleryCounter = document.getElementById('gallery-counter');

  const titleEl = document.getElementById('property-title');
  const locationEl = document.getElementById('property-location');
  const priceEl = document.getElementById('property-price');
  const priceBigEl = document.getElementById('property-price-big');
  const surfaceEl = document.getElementById('property-surface');
  const roomsEl = document.getElementById('property-rooms');
  const typeEl = document.getElementById('property-type');
  const descriptionEl = document.getElementById('property-description');
  const agencyNameEl = document.getElementById('agency-name');
  const agencyDetailsEl = document.getElementById('agency-details');

  const favoriteBtn = document.getElementById('btn-favorite');
  const favoriteHint = document.getElementById('favorite-hint');
  const contactForm = document.getElementById('contact-form');
  const contactName = document.getElementById('contact-name');
  const contactEmail = document.getElementById('contact-email');
  const contactMessage = document.getElementById('contact-message');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  let galleryImages = [];
  let galleryIndex = 0;

  if (!id) {
    showError(errorBox, 'Aucun identifiant de bien fourni.');
    return;
  }

  function setSuccess(message) {
    if (!successBox) return;
    successBox.style.display = 'block';
    successBox.textContent = message;
    window.setTimeout(() => hideError(successBox), 3000);
  }

  function renderGallery() {
    if (!galleryImages.length) return;
    const image = galleryImages[galleryIndex];
    galleryImage.src = image;
    galleryImage.alt = `${titleEl.textContent || 'Bien immobilier'} - image ${galleryIndex + 1}`;
    galleryCounter.textContent = `${galleryIndex + 1}/${galleryImages.length}`;
    galleryPrev.style.display = galleryImages.length > 1 ? 'grid' : 'none';
    galleryNext.style.display = galleryImages.length > 1 ? 'grid' : 'none';

    galleryThumbs.innerHTML = '';
    galleryImages.forEach((url, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `property-gallery__thumb${index === galleryIndex ? ' is-active' : ''}`;
      button.innerHTML = `<img src="${url}" alt="Miniature ${index + 1}" />`;
      button.addEventListener('click', () => {
        galleryIndex = index;
        renderGallery();
      });
      galleryThumbs.appendChild(button);
    });
  }

  function moveGallery(direction) {
    if (!galleryImages.length) return;
    galleryIndex = (galleryIndex + direction + galleryImages.length) % galleryImages.length;
    renderGallery();
  }

  function fillProperty(property) {
    const city = property.city || 'Ville non renseignée';
    const surface = property.surface ?? property.area ?? '—';
    const rooms = property.rooms ?? property.nb_rooms ?? property.pieces ?? '—';
    const type = property.type || 'Bien immobilier';
    const description =
      property.description ||
      'Aucune description n’a encore été renseignée pour ce bien.';

    titleEl.textContent = property.title || 'Bien immobilier';
    locationEl.textContent = city;

    priceEl.textContent = formatPrice(property.price);
    priceBigEl.textContent = formatPrice(property.price);
    surfaceEl.textContent = `${surface} m²`;
    roomsEl.textContent = `${rooms}`;
    typeEl.textContent = type;
    descriptionEl.textContent = description;

    agencyNameEl.textContent = property.agency_name || 'Agence Y-Plaza';
    const details = [
      property.agency_city || property.city,
      property.agency_phone,
      property.agency_email,
      property.agency_address,
    ].filter(Boolean);
    agencyDetailsEl.textContent = details.length
      ? details.join(' · ')
      : 'Coordonnées disponibles via le formulaire de contact.';

    galleryImages = getPropertyImages(property);
    galleryIndex = 0;
    renderGallery();

    document.title = `Y-Plaza - ${property.title || 'Détail du bien'}`;
  }

  async function setupFavorites() {
    if (!favoriteBtn) return;
    const user = getCurrentUser();
    if (!user) {
      favoriteBtn.disabled = true;
      favoriteBtn.setAttribute('aria-pressed', 'false');
      if (favoriteHint) favoriteHint.textContent = 'Connectez-vous pour sauvegarder ce bien.';
      return;
    }

    favoriteBtn.disabled = false;
    let isFavorite = false;

    try {
      const result = await apiGetFavorites();
      const favorites = Array.isArray(result.data) ? result.data : [];
      isFavorite = favorites.some((fav) => String(fav.property_id ?? fav.id) === String(id));
    } catch (e) {
      isFavorite = false;
    }

    function updateFavoriteButton() {
      favoriteBtn.textContent = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';
      favoriteBtn.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
      if (favoriteHint) {
        favoriteHint.textContent = isFavorite
          ? 'Ce bien est enregistré dans vos favoris.'
          : 'Ajoutez ce bien à vos favoris pour le retrouver plus tard.';
      }
    }

    updateFavoriteButton();

    favoriteBtn.addEventListener('click', async () => {
      try {
        favoriteBtn.disabled = true;
        if (isFavorite) {
          await apiRemoveFavorite(id);
          isFavorite = false;
        } else {
          await apiAddFavorite(id);
          isFavorite = true;
        }
        updateFavoriteButton();
      } catch (e) {
        showError(errorBox, e.message || 'Impossible de mettre à jour les favoris.');
      } finally {
        favoriteBtn.disabled = false;
      }
    });
  }

  function setupContact(property) {
    const user = getCurrentUser();
    if (user) {
      contactName.value = user.name || '';
      contactEmail.value = user.email || '';
    }

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideError(errorBox);
      try {
        await apiContactAgency(property.id, {
          name: contactName.value,
          email: contactEmail.value,
          message: contactMessage.value,
        });
        contactForm.reset();
        if (user) {
          contactName.value = user.name || '';
          contactEmail.value = user.email || '';
        }
        setSuccess('Votre message a bien été transmis à l’agence.');
      } catch (e) {
        showError(errorBox, e.message || 'Impossible d’envoyer le message.');
      }
    });
  }

  galleryPrev.addEventListener('click', () => moveGallery(-1));
  galleryNext.addEventListener('click', () => moveGallery(1));

  try {
    hideError(errorBox);
    const result = await apiGetProperty(id);
    const property = result.property || result;
    fillProperty(property);
    setupContact(property);
    await setupFavorites();
  } catch (e) {
    showError(errorBox, e.message || 'Impossible de charger le bien.');
  }
});
