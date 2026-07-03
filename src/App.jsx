import React, { useState, useEffect } from 'react';
import { Navbar, Container, Nav, Form, Button, Alert } from 'react-bootstrap'; 
import './index.css'; // подключаем наши современные кастомные стили

// --- НАСТРОЙКА КАРТЫ LEAFLET ---
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// регулярное выражение для проверки российских номеров телефонов
const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[49][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;

// компонент, который слушает клики по карте и передает координаты в форму
function MapClickHandler({ setLat, setLng }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat.toFixed(6));
      setLng(e.latlng.lng.toFixed(6));
    },
  });
  return null;
}

// компонент для принудительного перемещения карты при поиске адреса
function ChangeMapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
}

// --- КОМПОНЕНТ КАРТОЧКИ ПИТОМЦА ---
function PetCard({ pet, onFocusOnMap, onOpenDetails }) {
  const [address, setAddress] = useState('Загрузка адреса...');

  useEffect(() => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pet.lat}&lon=${pet.lng}&zoom=18&addressdetails=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.address) {
          const road = data.address.road || '';
          const house = data.address.house_number || '';
          const suburb = data.address.suburb || data.address.city || '';
          setAddress(road ? `${road}${house ? ', ' + house : ''}` : (suburb || 'Неизвестный адрес'));
        } else {
          setAddress('Адрес не определен');
        }
      })
      .catch(() => setAddress('Адрес недоступен'));
  }, [pet.lat, pet.lng]);

  return (
    <div className="col">
      <div 
        className="card h-100 border-0 position-relative" 
        onClick={() => { onFocusOnMap([pet.lat, pet.lng]); window.scrollTo({ top: 240, behavior: 'smooth' }); }}
      >
        <span className={`pet-status-badge badge-absolute ${pet.status === 'потерялся' ? 'lost' : 'found'}`}>
          {pet.status === 'потерялся' ? '💔 Потерялся' : '💚 Найден'}
        </span>
        
        {pet.image ? (
          <img src={pet.image} className="card-img-top" alt={pet.name} style={{ height: '200px', objectFit: 'cover' }} />
        ) : (
          <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '200px' }}>📷 Нет фото</div>
        )}
        
        <div className="card-body d-flex flex-column justify-content-between p-4">
          <div>
            <h5 className="card-title mb-1 fw-bold text-dark">{pet.name}</h5>
            <p className="text-primary small mb-3 fw-semibold">📍 {address}</p>
            <p className="card-text text-muted small mb-2"><strong>Порода:</strong> {pet.breed}</p>
            <p className="card-text small text-secondary text-truncate">{pet.description}</p>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <small className="text-muted">{new Date(pet.createdAt).toLocaleDateString()}</small>
            <button 
              className="btn btn-sm btn-light text-primary rounded-3 border-0 fw-bold px-3"
              title="Открыть анкету"
              onClick={(e) => {
                e.stopPropagation(); 
                onOpenDetails(pet, address);
              }}
            >
              Подробнее ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ ---
export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('petUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authMode, setAuthMode] = useState('login'); // login, register, forgot, reset
  const [addressSearch, setAddressSearch] = useState(''); 
  const [isSearchingAddress, setIsSearchingAddress] = useState(false); 
  
  const [selectedOwnerId, setSelectedOwnerId] = useState(null); 
  const [ownerProfile, setOwnerProfile] = useState(null); 
  const [ownerAds, setOwnerAds] = useState([]); 
  const [isLoadingOwner, setIsLoadingOwner] = useState(false); 
  const [modalOwnerName, setModalOwnerName] = useState('Загрузка...');

  const [selectedPetCoords, setSelectedPetCoords] = useState(null); 
  const [activeModalPet, setActiveModalPet] = useState(null);

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // новые стейты для сброса пароля по смс
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [page, setPage] = useState('map'); 
  const [pets, setPets] = useState([]); 
  const [userPets, setUserPets] = useState([]);

  const [status, setStatus] = useState('потерялся');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('все');
  const [isPulseActive, setIsPulseActive] = useState(false);

  // новые стейты для редактирования профиля
  const [profileName, setProfileName] = useState(user ? user.name : '');
  const [profilePhone, setProfilePhone] = useState(user ? user.phone || '' : '');
  const [profileWhatsapp, setProfileWhatsapp] = useState(user ? user.whatsapp || '' : '');
  const [profileTelegram, setProfileTelegram] = useState(user ? user.telegram || '' : '');
  const [profileBio, setProfileBio] = useState(user ? user.bio || '' : '');
  const [profileAvatar, setProfileAvatar] = useState(user ? user.avatar || '' : '');
  const [profileSmsCode, setProfileSmsCode] = useState('');
  const [isProfileSmsSent, setIsProfileSmsSent] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // синхронизация профиля при обновлении данных пользователя
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone || '');
      setProfileWhatsapp(user.whatsapp || '');
      setProfileTelegram(user.telegram || '');
      setProfileBio(user.bio || '');
      setProfileAvatar(user.avatar || '');
    }
  }, [user]);

  // =========================================================================
  // НАЧАЛО БЛОКА: ХУКИ ДЛЯ ИСТОРИИ БРАУЗЕРА (КНОПКА "НАЗАД")
  // =========================================================================
  
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        setPage(event.state.page);
      } else {
        setPage('map');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!window.history.state || window.history.state.page !== page) {
      window.history.pushState({ page }, '', `?page=${page}`);
    }
  }, [page]);

  // =========================================================================
  // КОНЕЦ БЛОКА: ХУКИ ДЛЯ ИСТОРИИ БРАУЗЕРА
  // =========================================================================

  useEffect(() => {
    if (user) {
      fetch('https://lost-pets-api-gkoe.onrender.com/api/pets')
        .then(res => res.json())
        .then(data => setPets(data))
        .catch(err => console.error(err));
    }
  }, [page, user]);

  useEffect(() => {
    if (user && page === 'profile') {
      fetch(`https://lost-pets-api-gkoe.onrender.com/api/pets/user/${user.id}`)
        .then(res => res.json())
        .then(data => setUserPets(data))
        .catch(err => console.error(err));
    }
  }, [page, user]);

  const openOwnerProfile = (ownerId) => {
    if (!ownerId) return;
    setSelectedOwnerId(ownerId);
    setIsLoadingOwner(true);
    setPage('owner_profile'); 
    setActiveModalPet(null); 

    fetch(`https://lost-pets-api-gkoe.onrender.com/api/users/${ownerId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOwnerProfile(data.user);
          setOwnerAds(data.ads);
        } else {
          alert('не удалось загрузить профиль пользователя');
          setPage('map');
        }
        setIsLoadingOwner(false);
      })
      .catch(err => {
        console.error('ошибка загрузки профиля:', err);
        setIsLoadingOwner(false);
        setPage('map');
      });
  };

  const handleAddressSearch = () => {
    if (!addressSearch.trim()) return;
    setIsSearchingAddress(true);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          setLat(parseFloat(result.lat).toFixed(6));
          setLng(parseFloat(result.lon).toFixed(6));
        } else {
          alert('адрес не найден. попробуйте ввести точнее.');
        }
        setIsSearchingAddress(false);
      })
      .catch(err => {
        console.error('ошибка поиска адреса:', err);
        setIsSearchingAddress(false);
      });
  };

  const filteredPets = pets.filter(pet => {
    const matchesStatus = statusFilter === 'все' || pet.status === statusFilter;
    const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pet.breed.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleDelete = (petId) => {
    if (window.confirm('вы уверены, что хотите удалить это объявление?')) {
      fetch(`https://lost-pets-api-gkoe.onrender.com/api/pets/${petId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('объявление успешно удалено!');
          setUserPets(userPets.filter(pet => pet._id !== petId));
        }
      })
      .catch(err => console.error(err));
    }
  };

  // отправка запроса на получение смс-кода для восстановления пароля
  const handleSendResetCode = () => {
    setAuthError('');
    setAuthSuccess('');

    if (!resetPhone) {
      setAuthError('введите номер телефона для восстановления');
      return;
    }

    if (!phoneRegex.test(resetPhone)) {
      setAuthError('неверный формат номера. используйте формат +79991112233');
      return;
    }

    fetch('https://lost-pets-api-gkoe.onrender.com/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: resetPhone })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setAuthSuccess('смс с кодом успешно отправлено');
        setAuthMode('reset');
        if (data.testCode) {
          console.log('тестовый код сброса:', data.testCode);
        }
      } else {
        setAuthError(data.message);
      }
    })
    .catch(() => setAuthError('ошибка отправки запроса на сервер'));
  };

  // отправка кода подтверждения и нового пароля в бэкенд
  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setAuthError('');

    fetch('https://lost-pets-api-gkoe.onrender.com/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: resetPhone, code: resetCode, newPassword: resetNewPassword })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('пароль успешно изменен. теперь вы можете войти.');
        setAuthMode('login');
        setResetPhone('');
        setResetCode('');
        setResetNewPassword('');
      } else {
        setAuthError(data.message);
      }
    })
    .catch(() => setAuthError('ошибка изменения пароля на сервере'));
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const url = authMode === 'register' 
      ? 'https://lost-pets-api-gkoe.onrender.com/api/auth/register' 
      : 'https://lost-pets-api-gkoe.onrender.com/api/auth/login';

    const bodyData = authMode === 'register'
      ? { name: authName, email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        setAuthError(data.message);
      } else {
        if (authMode === 'register') {
          setAuthSuccess('регистрация успешна! теперь войдите в аккаунт.');
          setAuthMode('login');
          setAuthPassword('');
        } else {
          localStorage.setItem('petUser', JSON.stringify(data.user));
          setUser(data.user);
        }
      }
    })
    .catch(err => setAuthError('ошибка подключения к серверу'));
  };

  const handleLogout = () => {
    localStorage.removeItem('petUser');
    setUser(null);
    setPage('map');
  };

  // --- ЭКРАН АВТОРИЗАЦИИ И СБРОСА ПАРОЛЯ ---
  if (!user) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
        <div className="p-5 bg-white rounded-4 border-0 shadow-lg" style={{ width: '100%', maxWidth: '440px' }}>
          <h2 className="text-center fw-bold mb-2">🐾 LOST & FOUND</h2>
          <p className="text-center text-muted small mb-4">сервис поиска потерянных домашних животных</p>
          
          <h5 className="text-center fw-semibold mb-4 text-secondary">
            {authMode === 'login' && '🔑 вход в систему'}
            {authMode === 'register' && '📝 создание аккаунта'}
            {authMode === 'forgot' && '🔒 восстановление пароля'}
            {authMode === 'reset' && '🔢 ввод нового пароля'}
          </h5>

          {authError && <Alert variant="danger" className="rounded-3 small">{authError}</Alert>}
          {authSuccess && <Alert variant="success" className="rounded-3 small">{authSuccess}</Alert>}

          {/* форма обычного входа и регистрации */}
          {(authMode === 'login' || authMode === 'register') && (
            <Form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold text-secondary small">ваше имя</Form.Label>
                  <Form.Control type="text" placeholder="иван иванов" value={authName} onChange={(e) => setAuthName(e.target.value)} required />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-secondary small">email адрес</Form.Label>
                <Form.Control type="email" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-secondary small">пароль</Form.Label>
                <Form.Control type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
              </Form.Group>

              <Button type="submit" className="w-100 mb-3 py-2.5 fw-bold btn-primary shadow-sm">
                {authMode === 'login' ? 'войти' : 'зарегистрироваться'}
              </Button>

              <div className="text-center d-flex flex-column gap-1">
                {authMode === 'login' ? (
                  <>
                    <button type="button" className="btn btn-link btn-sm text-decoration-none fw-medium text-primary" onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}>
                      нет аккаунта? зарегистрироваться
                    </button>
                    <button type="button" className="btn btn-link btn-sm text-decoration-none fw-medium text-secondary small" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}>
                      забыли пароль? восстановить по смс
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-link btn-sm text-decoration-none fw-medium text-primary" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}>
                    уже есть аккаунт? войти
                  </button>
                )}
              </div>
            </Form>
          )}

          {/* шаг 1: ввод номера телефона для запроса кода */}
          {authMode === 'forgot' && (
            <div>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-secondary small">номер телефона</Form.Label>
                <Form.Control type="text" placeholder="+79991112233" value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} />
              </Form.Group>
              <Button type="button" className="w-100 mb-3 py-2.5 fw-bold btn-primary shadow-sm" onClick={handleSendResetCode}>
                получить код в смс
              </Button>
              <div className="text-center">
                <button type="button" className="btn btn-link btn-sm text-decoration-none fw-medium text-primary" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}>
                  вернуться назад к входу
                </button>
              </div>
            </div>
          )}

          {/* шаг 2: ввод полученного кода и нового пароля */}
          {authMode === 'reset' && (
            <Form onSubmit={handleResetPasswordSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-secondary small">4-значный код из смс</Form.Label>
                <Form.Control type="text" placeholder="1234" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required maxLength="4" className="text-center" />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-secondary small">новый пароль</Form.Label>
                <Form.Control type="password" placeholder="••••••••" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required />
              </Form.Group>
              <Button type="submit" className="w-100 mb-3 py-2.5 fw-bold btn-primary shadow-sm">
                сохранить новый пароль
              </Button>
            </Form>
          )}

        </div>
      </div>
    );
  }

  // --- ОСНОВНОЙ РАБОЧИЙ ИНТЕРФЕЙС ---
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* СОВРЕМЕННЫЙ НАВБАР */}
      <Navbar fixed="top" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand href="#" className="fw-bold fs-4">🐾 Поиск Питомцев</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link active={page === 'map'} onClick={() => setPage('map')}>🗺️ Карта и поиск</Nav.Link>
              <Nav.Link active={page === 'add'} onClick={() => setPage('add')}>➕ Добавить объявление</Nav.Link>
              <Nav.Link active={page === 'profile'} onClick={() => setPage('profile')}>👤 Кабинет ({user.name})</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <div style={{ paddingTop: '90px' }}></div>

      <Container className="mt-4">
        
        {/* ВКЛАДКА 1: КАРТА И ЛЕНТА ОБЪЯВЛЕНИЙ */}
        {page === 'map' && (
          <div className="p-4 bg-white rounded-4 border border-light shadow-sm">
            <h2 className="fw-bold mb-4 text-dark">🗺️ Карта активности</h2>
            
            <div className="row g-3 mb-4 p-3 rounded-4" style={{ background: '#F9FAFB' }}>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-muted small">Поиск по ключевым словам</label>
                <input type="text" className="form-control" placeholder="Поиск по кличке или породе..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-muted small">Категория объявлений</label>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="все">🔍 Все домашние животные</option>
                  <option value="потерялся">💔 Только пропавшие питомцы</option>
                  <option value="найден">💚 Только найденные питомцы</option>
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 px-1">
              <span className="text-muted small">Активных меток: <strong className="text-dark">{filteredPets.length}</strong></span>
              {(searchQuery || statusFilter !== 'все') && (
                <button className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold text-primary" onClick={() => { setSearchQuery(''); setStatusFilter('все'); }}>🧹 Очистить фильтры</button>
              )}
            </div>
            
            <div style={{ height: '440px', width: '100%', marginBottom: '40px' }} className="shadow-sm rounded-4 overflow-hidden border">
              <MapContainer center={[55.75, 37.61]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {selectedPetCoords && <ChangeMapCenter center={selectedPetCoords} />}
                
                {filteredPets.map(pet => {
                  if (!pet.lat || !pet.lng) return null;

                  const createdTime = pet.createdAt ? new Date(pet.createdAt).getTime() : new Date().getTime(); 
                  const currentTime = new Date().getTime();
                  const hoursPassed = (currentTime - createdTime) / (1000 * 60 * 60);
                  const isFreshLoss = hoursPassed <= 24; 

                  // заглушка, если у питомца нет фотографии (красивая иконка лапки)
                  const petImageUrl = pet.image || 'https://img.icons8.com/ios-filled/50/737373/paw.png';
                  
                  // настраиваем динамические цвета для css-переменных
                  const borderColor = pet.status === 'потерялся' ? '#ff3b30' : '#34c759';
                  const shadowColor = pet.status === 'потерялся' ? 'rgba(255, 59, 48, 0.6)' : 'rgba(52, 199, 89, 0.6)';

                  // генерируем html-иконку, передавая цвета через стили
                  const customIcon = L.divIcon({
                    className: 'custom-pet-marker',
                    html: `
                      <div 
                        class="pet-marker-avatar" 
                        style="background-image: url('${petImageUrl}'); --marker-color: ${borderColor}; --shadow-color: ${shadowColor};"
                      ></div>
                    `,
                    iconSize: [42, 42],
                    iconAnchor: [21, 21],
                    popupAnchor: [0, -24]
                  });

                  return (
                    <React.Fragment key={pet._id}>
                      {/* маркер с кастомной аватаркой */}
                      <Marker position={[pet.lat, pet.lng]} icon={customIcon}>
                        <Popup>
                          <div className="p-1" style={{ maxWidth: '200px' }}>
                            <h6 className="fw-bold mb-1" style={{ color: pet.status === 'потерялся' ? '#dc3545' : '#198754' }}>
                              {pet.status === 'потерялся' ? '💔' : '💚'} {pet.name}
                            </h6>
                            <p className="text-muted small mb-2"><b>Порода:</b> {pet.breed}</p>
                            {pet.image && (
                              <img src={pet.image} alt={pet.name} className="img-fluid rounded border mb-2" style={{ maxHeight: '100px', width: '100%', objectFit: 'cover' }} />
                            )}
                            
                            {pet.status === 'потерялся' && (
                              <div className="alert py-1 px-2 mb-2 border-0 text-center fw-medium" style={{ fontSize: '0.75rem', backgroundColor: isFreshLoss ? '#FFF1F2' : '#FEF3C7', color: isFreshLoss ? '#BE123C' : '#B45309' }}>
                                {isFreshLoss 
                                  ? '⏳ Потерян недавно! Зона поиска в радиусе 1 км.' 
                                  : '⚠️ Прошло более 24 часов. Мог уйти дальше.'}
                              </div>
                            )}

                            {/* кнопка подробнее с функцией загрузки имени автора объявления */}
                            <button 
                              className="btn btn-primary btn-sm w-100 py-1 fw-medium" 
                              style={{ fontSize: '12px' }}
                              onClick={() => {
                                setActiveModalPet({ ...pet, calculatedAddress: pet.calculatedAddress || 'Координаты на карте' });
                                setModalOwnerName('Загрузка...');
                                if (pet.userId) {
                                  fetch(`https://lost-pets-api-gkoe.onrender.com/api/users/${pet.userId}`)
                                    .then(res => res.json())
                                    .then(data => {
                                      if (data.success && data.user && data.user.name) setModalOwnerName(data.user.name);
                                      else setModalOwnerName(`Пользователь #${pet.userId.substring(0, 6)}`);
                                    })
                                    .catch(() => setModalOwnerName(`Пользователь #${pet.userId.substring(0, 6)}`));
                                }
                              }}
                            >
                              🔍 Подробнее
                            </button>
                          </div>
                        </Popup>
                      </Marker>

                      {/* радиус поиска для свежих пропаж */}
                      {pet.status === 'потерялся' && isFreshLoss && (
                        <Circle
                          center={[pet.lat, pet.lng]}
                          pathOptions={{
                            color: '#E11D48',       
                            fillColor: '#FDA4AF',   
                            fillOpacity: 0.3,       
                            stroke: true,
                            weight: 1.5             
                          }}
                          radius={1000}             
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>


            {/* ЛЕНТА ОБЪЯВЛЕНИЙ */}
            <div className="mt-4">
              <h3 className="fw-bold mb-4 pb-2 border-bottom text-dark">📋 Последние объявления</h3>
              {filteredPets.length === 0 ? (
                <p className="text-muted text-center py-5 bg-light rounded-4">По вашему запросу объявлений не найдено.</p>
              ) : (
                <div className="row row-cols-1 row-cols-md-3 g-4">
                  {filteredPets.map(pet => (
                    <PetCard 
                      key={pet._id} 
                      pet={pet} 
                      onFocusOnMap={setSelectedPetCoords} 
                      
                      /* ИСПРАВЛЕНО: Теперь при открытии анкеты мы загружаем имя автора с сервера */
                      onOpenDetails={(p, addr) => {
                        // 1. Моментально открываем модалку с данными питомца
                        setActiveModalPet({ ...p, calculatedAddress: addr });
                        // 2. Ставим имя в режим ожидания
                        setModalOwnerName('Загрузка...');
                        
                        // 3. Делаем запрос к API пользователей
                        if (p.userId) {
                          fetch(`https://lost-pets-api-gkoe.onrender.com/api/users/${p.userId}`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.success && data.user && data.user.name) {
                                // Подставляем настоящее имя, если нашли
                                setModalOwnerName(data.user.name);
                              } else {
                                // Заглушка, если имени нет
                                setModalOwnerName(`Пользователь #${p.userId.substring(0, 6)}`);
                              }
                            })
                            .catch(() => {
                              // Заглушка на случай ошибки сети
                              setModalOwnerName(`Пользователь #${p.userId.substring(0, 6)}`);
                            });
                        } else {
                          setModalOwnerName('Неизвестный автор');
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: ПОДАТЬ ОБЪЯВЛЕНИЕ */}
        {page === 'add' && (
          <div className="p-4 bg-white rounded-4 border border-light shadow-sm" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 className="fw-bold mb-2 text-center text-dark">➕ Новое объявление</h2>
            <p className="text-muted text-center small mb-4">Заполните анкету, чтобы опубликовать карточку питомца на карте</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!lat || !lng) {
                alert('⚠️ Пожалуйста, зафиксируйте точку встречи на карте!');
                return;
              }
              const newPetData = { status, name, breed, description, image, lat: parseFloat(lat), lng: parseFloat(lng), userId: user.id };

              fetch('https://lost-pets-api-gkoe.onrender.com/api/pets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPetData)
              })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  alert('🎉 Объявление успешно размещено на карте!');
                  setName(''); setBreed(''); setDescription(''); setLat(''); setLng(''); setImage(''); setAddressSearch('');
                  setPage('map');
                }
              })
              .catch(err => console.error(err));
            }}>
              
              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small">Текущий статус</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="потерялся">Я потерял питомца (Потерялся 💔)</option>
                  <option value="найден">Я нашел чужого питомца (Найден 💚)</option>
                </select>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-secondary small">Кличка животного</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Боня, Джек и др." />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-secondary small">Порода</label>
                  <input type="text" className="form-control" value={breed} onChange={(e) => setBreed(e.target.value)} required placeholder="Сибирская хаски, овчарка..." />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small">Подробные приметы</label>
                <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Опишите окрас, цвет ошейника, клеймо, пугливость или шрамы..."></textarea>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">Фотография</label>
                <input type="file" className="form-control" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImage(reader.result);
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>

              <div className="mb-4 p-4 rounded-4" style={{ background: '#F9FAFB' }}>
                <label className="form-label fw-bold text-primary mb-1">📍 Геолокация происшествия</label>
                <p className="text-muted small mb-3">Используйте умный текстовый поиск или кликните по мини-карте вручную.</p>
                
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    className="form-control border-end-0" 
                    placeholder="Введи адрес (например: Москва, Ленина 15)" 
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                  />
                  <button className="btn btn-outline-primary px-4 fw-bold" type="button" onClick={handleAddressSearch} disabled={isSearchingAddress}>
                    {isSearchingAddress ? 'Поиск...' : 'Найти'}
                  </button>
                </div>

                <div style={{ height: '260px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} className="border shadow-sm mb-3">
                  <MapContainer center={[55.75, 37.61]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler setLat={setLat} setLng={setLng} />
                    {lat && lng && <ChangeMapCenter center={[parseFloat(lat), parseFloat(lng)]} />}
                    {lat && lng && (
                      <Marker position={[parseFloat(lat), parseFloat(lng)]}>
                        <Popup>Выбранная точка</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                <div className="text-center">
                  {!lat || !lng ? (
                    <span className="badge-location badge-location-danger">⚠️ Точка локации не зафиксирована</span>
                  ) : (
                    <span className="badge-location badge-location-success">✅ Точка успешно установлена</span>
                  )}
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary w-100 btn-lg shadow fw-bold py-3">🚀 Разместить объявиение</button>
            </form>
          </div>
        )}

        {/* ВКЛАДКА 3: ЛИЧНЫЙ КАБИНЕТ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ */}
        {page === 'profile' && (
          <div className="row g-4">
            {/* левая колонка: основная карточка и кнопка выхода */}
            <div className="col-md-4">
              <div className="p-4 bg-white rounded-4 border border-light shadow-sm text-center">
                {profileAvatar ? (
                  <img 
                    src={profileAvatar} 
                    alt={user.name} 
                    className="rounded-circle object-fit-cover mb-3 shadow-sm" 
                    style={{ width: '90px', height: '90px', border: '2px solid var(--bs-primary)' }} 
                  />
                ) : (
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold shadow-sm" style={{ width: '90px', height: '90px', fontSize: '36px' }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <h4 className="fw-bold mb-1 text-dark">{user.name}</h4>
                <p className="text-muted small mb-3">Участник сообщества</p>
                <hr className="my-3" />
                <p className="text-start mb-4 small text-secondary"><strong>Email аккаунта:</strong> <br />{user.email}</p>
                <button className="btn btn-outline-danger btn-sm w-100 py-2 fw-semibold" onClick={handleLogout}>🚪 Выйти из профиля</button>
              </div>
            </div>
            
            {/* правая колонка: редактирование данных и управление объявлениями */}
            <div className="col-md-8">
              {/* подблок а: настройки расширенного профиля */}
              <div className="p-4 bg-white rounded-4 border border-light shadow-sm mb-4">
                <h3 className="fw-bold mb-4 text-dark">⚙️ Настройки профиля</h3>
                
                {profileError && <Alert variant="danger" className="rounded-3 small">{profileError}</Alert>}
                {profileSuccess && <Alert variant="success" className="rounded-3 small">{profileSuccess}</Alert>}

                <Form onSubmit={(e) => {
                  e.preventDefault();
                  setProfileError('');
                  setProfileSuccess('');

                  // если телефон изменился или вводится заново, проверяем его регуляркой
                  if (profilePhone && profilePhone !== (user.phone || '')) {
                    if (!phoneRegex.test(profilePhone)) {
                      setProfileError('неверный формат номера телефона. используйте формат +79991112233');
                      return;
                    }
                    // если смс еще не отправлено, инициируем отправку кода подтверждения
                    if (!isProfileSmsSent) {
                      fetch('https://lost-pets-api-gkoe.onrender.com/api/users/send-phone-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: profilePhone, userId: user.id })
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          setIsProfileSmsSent(true);
                          setProfileSuccess('код подтверждения отправлен в смс. введите его ниже для сохранения номера.');
                          if (data.testCode) {
                            console.log('тестовый код верификации:', data.testCode);
                          }
                        } else {
                          setProfileError(data.message);
                        }
                      })
                      .catch(() => setProfileError('ошибка отправки смс-кода на сервер'));
                      return;
                    }
                  }

                  // сбор общих измененных данных профиля для отправки в бэкенд
                  const updatedData = {
                    name: profileName,
                    whatsapp: profileWhatsapp,
                    telegram: profileTelegram,
                    bio: profileBio,
                    avatar: profileAvatar,
                    code: profileSmsCode // передается, если подтверждается телефон
                  };

                  fetch(`https://lost-pets-api-gkoe.onrender.com/api/users/profile/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      setProfileSuccess('профиль успешно обновлен!');
                      localStorage.setItem('petUser', JSON.stringify(data.user));
                      setUser(data.user);
                      setIsProfileSmsSent(false);
                      setProfileSmsCode('');
                    } else {
                      setProfileError(data.message);
                    }
                  })
                  .catch(() => setProfileError('ошибка обновления данных на сервере'));
                }}>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary small">Отображаемое имя</Form.Label>
                        <Form.Control type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary small">Номер телефона (для связи и СМС)</Form.Label>
                        <Form.Control 
                          type="text" 
                          placeholder="+79991112233" 
                          value={profilePhone} 
                          onChange={(e) => {
                            setProfilePhone(e.target.value);
                            if (isProfileSmsSent) setIsProfileSmsSent(false); // сбрасываем отправку, если номер начали менять
                          }} 
                        />
                      </Form.Group>
                    </div>
                  </div>

                  {/* поле ввода кода из смс при привязке телефона */}
                  {isProfileSmsSent && (
                    <Form.Group className="mb-3 p-3 rounded-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <Form.Label className="fw-bold text-warning-custom small">Введите 4-значный код подтверждения</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="1234" 
                        value={profileSmsCode} 
                        onChange={(e) => setProfileSmsCode(e.target.value)} 
                        maxLength="4" 
                        required 
                        className="text-center fw-bold"
                        style={{ maxWidth: '150px', margin: '0 auto' }}
                      />
                    </Form.Group>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary small">Никнейм Telegram (без @)</Form.Label>
                        <Form.Control type="text" placeholder="username" value={profileTelegram} onChange={(e) => setProfileTelegram(e.target.value)} />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary small">Ссылка или номер WhatsApp</Form.Label>
                        <Form.Control type="text" placeholder="79991112233" value={profileWhatsapp} onChange={(e) => setProfileWhatsapp(e.target.value)} />
                      </Form.Group>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Form.Group>
                      <Form.Label className="fw-semibold text-secondary small">Фото профиля (аватар)</Form.Label>
                      <Form.Control type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setProfileAvatar(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </Form.Group>
                  </div>

                  <div className="mb-4">
                    <Form.Group>
                      <Form.Label className="fw-semibold text-secondary small">О себе</Form.Label>
                      <Form.Control as="textarea" rows="2" placeholder="расскажите немного о себе или укажите дополнительные контакты..." value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
                    </Form.Group>
                  </div>

                  <Button type="submit" className="btn btn-primary btn-sm px-4 fw-bold shadow-sm">
                    {isProfileSmsSent ? 'Подтвердить код и сохранить' : 'Сохранить изменения'}
                  </Button>
                </Form>
              </div>

              {/* подблок б: список личных объявлений текущего пользователя */}
              <div className="p-4 bg-white rounded-4 border border-light shadow-sm">
                <h3 className="fw-bold mb-4 text-dark">📋 Управление публикациями ({userPets.length})</h3>
                {userPets.length === 0 ? (
                  <p className="text-muted py-4 text-center bg-light rounded-3">Вы еще не опубликовали ни одного активного объявления.</p>
                ) : (
                  <div className="row row-cols-1 row-cols-md-2 g-3">
                    {userPets.map(pet => (
                      <div key={pet._id} className="col">
                        <div className="card h-100 border-light shadow-sm">
                          {pet.image && <img src={pet.image} className="card-img-top" alt={pet.name} style={{ height: '140px', objectFit: 'cover' }} />}
                          <div className="card-body d-flex flex-column justify-content-between p-3">
                            <div>
                              <h5 className="card-title fw-bold text-dark mb-1">{pet.status === 'потерялся' ? '💔' : '💚'} {pet.name}</h5>
                              <p className="card-text text-muted small mb-2"><strong>Порода:</strong> {pet.breed}</p>
                              <p className="card-text small text-secondary text-truncate">{pet.description}</p>
                            </div>
                            <button className="btn btn-danger btn-sm w-100 mt-3 py-2 fw-semibold" onClick={() => handleDelete(pet._id)}>🗑️ Отозвать объявление</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: ПУБЛИЧНАЯ СТРАНИЦА ДРУГОГО ПОЛЬЗОВАТЕЛЯ */}
        {page === 'owner_profile' && (
          <div className="p-4 bg-white rounded-4 border border-light shadow-sm">
            <button className="btn btn-outline-secondary btn-sm mb-4 px-3" onClick={() => setPage('map')}>
              ⬅️ Назад к общей карте
            </button>

            {isLoadingOwner ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted mt-2">Загрузка карточки пользователя...</p>
              </div>
            ) : ownerProfile ? (
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="card border-0 p-4 text-center" style={{ background: '#F9FAFB' }}>
                    {ownerProfile.avatar ? (
                      <img src={ownerProfile.avatar} alt={ownerProfile.name} className="rounded-circle mx-auto img-thumbnail mb-3" style={{ width: '130px', height: '130px', objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-circle mx-auto bg-secondary text-white d-flex align-items-center justify-content-center mb-3 fw-bold fs-2 shadow-sm" style={{ width: '120px', height: '120px' }}>
                        {ownerProfile.name ? ownerProfile.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    
                    <h3 className="fw-bold text-dark mb-1">{ownerProfile.name}</h3>
                    <p className="text-muted small mb-3">Автор объявлений на платформе</p>
                    <p className="text-secondary small bg-white p-3 rounded-3 border border-light shadow-sm">{ownerProfile.bio || '💬 Описание профиля отсутствует.'}</p>
                    
                    <button className="btn btn-primary w-100 fw-bold my-3 py-2.5 shadow-sm" onClick={() => alert('💬 Модуль "Внутренний чат (WebSockets)" находится в стадии подключения на сервере.')}>
                      ✉️ Открыть диалог
                    </button>

                    <hr className="my-2" />
                    
                    <div className="text-start mt-3">
                      <h6 className="fw-bold text-muted small text-uppercase mb-3">📍 Прямые контакты:</h6>
                      <p className="mb-2 small"><strong>Почта:</strong> <a href={`mailto:${ownerProfile.email}`} className="text-decoration-none fw-medium">{ownerProfile.email}</a></p>
                      <p className="mb-2 small"><strong>Телефон:</strong> {ownerProfile.phone || 'не указан'}</p>
                      
                      {/* мессенджеры для быстрой связи с автором */}
                      <div className="d-flex flex-column gap-2 mt-3">
                        {ownerProfile.telegram && (
                          <a 
                            href={`https://t.me/${ownerProfile.telegram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm text-white fw-medium shadow-sm py-2 text-center"
                            style={{ backgroundColor: '#24A1DE' }}
                          >
                            ✈️ Написать в Telegram
                          </a>
                        )}
                        {ownerProfile.whatsapp && (
                          <a 
                            href={`https://wa.me/${ownerProfile.whatsapp.replace('+', '').replace(/[\s\-]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm text-white fw-medium shadow-sm py-2 text-center"
                            style={{ backgroundColor: '#25D366' }}
                          >
                            💬 Написать в WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-8">
                  <h4 className="fw-bold mb-4 pb-2 border-bottom text-dark">📋 Опубликованные объявления автора ({ownerAds.length})</h4>
                  {ownerAds.length === 0 ? (
                    <p className="text-muted py-4 text-center bg-light rounded-3">У этого автора сейчас нет активных объявлений.</p>
                  ) : (
                    <div className="row row-cols-1 row-cols-md-2 g-3">
                      {ownerAds.map(ad => (
                        <div className="col" key={ad._id}>
                          <div className="card h-100 border-light shadow-sm position-relative">
                            <span className={`pet-status-badge badge-absolute ${ad.status === 'потерялся' ? 'lost' : 'found'}`}>
                              {ad.status === 'потерялся' ? '💔 Потерялся' : '💚 Найден'}
                            </span>
                            
                            {ad.image ? (
                              <img src={ad.image} className="card-img-top" alt={ad.name} style={{ height: '150px', objectFit: 'cover' }} />
                            ) : (
                              <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '150px' }}>
                                📷 Нет фото
                              </div>
                            )}
                            <div className="card-body p-3">
                              <h5 className="card-title fw-bold text-dark mb-1">{ad.name}</h5>
                              <p className="card-text text-muted small mb-1"><strong>Порода:</strong> {ad.breed}</p>
                              <p className="card-text small text-secondary text-truncate">{ad.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-danger">Произошла ошибка при загрузке данных.</p>
            )}
          </div>
        )}

      </Container>

      {/* --- КРАСИВОЕ СОВРЕМЕННОЕ МОДАЛЬНОЕ ОКНО АНКЕТЫ ПИТОМЦА --- */}
      {activeModalPet && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1060 }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              
              {/* Шапка модалки */}
              <div className="modal-header border-0 px-4 pt-4 pb-0 bg-white">
                <h4 className="modal-title fw-bold text-dark">🐾 Анкета питомца: {activeModalPet.name}</h4>
                <button type="button" className="btn-close" onClick={() => { setActiveModalPet(null); setIsPulseActive(false); }} aria-label="Close"></button>
              </div>
              
              {/* Тело модалки */}
              <div className="modal-body p-4 bg-white">
                <div className="row g-4">
                  {/* Левая колонка: Изображение */}
                  <div className="col-md-6">
                    {activeModalPet.image ? (
                      <img src={activeModalPet.image} alt={activeModalPet.name} className="img-fluid rounded-4 shadow-sm border border-light" style={{ width: '100%', maxHeight: '340px', objectFit: 'cover' }} />
                    ) : (
                      <div className="bg-light h-100 d-flex align-items-center justify-content-center text-muted rounded-4 border" style={{ minHeight: '240px' }}>
                        📷 Фотография отсутствует
                      </div>
                    )}
                  </div>
                  
                  {/* Правая колонка: Описание и плашки */}
                  <div className="col-md-6 d-flex flex-column justify-content-between">
                    <div>
                      {/* СТАТУС-ПЛАШКА */}
                      <div className="mb-3">
                        <span className={`pet-status-badge ${activeModalPet.status === 'потерялся' ? 'lost' : 'found'}`}>
                          {activeModalPet.status === 'потерялся' ? '💔 Потерялся' : '💚 Найден'}
                        </span>
                      </div>
                      
                      {/* Live-предупреждение времени */}
                      {activeModalPet.status === 'потерялся' && (
                        <div className="time-alert-box mb-3">
                          {activeModalPet.createdAt && ((new Date().getTime() - new Date(activeModalPet.createdAt).getTime()) / (1000 * 60 * 60)) <= 24 ? (
                            <div className="alert alert-danger py-2 px-3 border-0 rounded-3 small m-0 d-flex align-items-center gap-2">
                              <span className={isPulseActive ? "pulse-dot" : "static-dot"} style={{ width: '8px', height: '8px', backgroundColor: '#dc3545', borderRadius: '50%', display: 'inline-block' }}></span>
                              <span>Активный поиск: питомец потерян недавно! Зона поиска в радиусе 1 км актуальна.</span>
                            </div>
                          ) : (
                            <div className="alert alert-warning py-2 px-3 border-0 rounded-3 small m-0">
                              ⚠️ Внимание: прошло более 24 часов. Зона поиска расширена, питомец мог переместиться.
                            </div>
                          )}
                        </div>
                      )}

                      <h3 className="fw-bold mb-1 text-dark">{activeModalPet.name}</h3>
                      <p className="text-primary fw-semibold small mb-3">📍 {activeModalPet.calculatedAddress || 'Координаты на карте'}</p>
                      
                      <hr className="my-2" />
                      <p className="mb-2 text-dark small"><strong>Порода:</strong> {activeModalPet.breed}</p>
                      <p className="mb-3 text-secondary small" style={{ whiteSpace: 'pre-line' }}>
                        <strong>Особые приметы:</strong><br />{activeModalPet.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* КЛИКАБЕЛЬНЫЙ БЛОК СВЯЗИ С АВТОРОМ */}
                <div 
                  className="p-3 rounded-4 border border-light shadow-sm mt-4"
                  style={{ 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: '#F9FAFB'
                  }}
                  title="Нажмите сюда, чтобы открыть профиль владельца"
                  onClick={() => {
                    if (activeModalPet.userId) {
                      openOwnerProfile(activeModalPet.userId);
                    } else {
                      alert("⚠️ У этого объявления не найден ID автора в базе данных.");
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#EEF2F6';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <h6 className="fw-bold text-muted small text-uppercase mb-2">👤 Карточка владельца (Профиль ➔)</h6>
                  
                  <p className="mb-1 text-dark small">
                    Автор: <strong className="text-primary">{modalOwnerName}</strong>
                  </p>
                  
                  <p className="text-muted small mb-3" style={{ fontSize: '12px' }}>
                    📋 Нажмите на этот блок, чтобы открыть подробный профиль и связаться через мессенджеры.
                  </p>
                  
                  <div className="d-flex gap-2">
                    {/* Кнопка прямого звонка сработает, только если в стейте загрузился телефон от бэкенда */}
                    <button 
                      type="button" 
                      className="btn btn-success btn-sm fw-bold w-50 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeModalPet.userId) {
                          openOwnerProfile(activeModalPet.userId);
                        }
                      }}
                    >
                      📞 Посмотреть телефон
                    </button>
                    <button 
                      type="button"
                      className="btn btn-primary btn-sm fw-bold w-50 py-2"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        if (activeModalPet.userId) openOwnerProfile(activeModalPet.userId);
                      }}
                    >
                      ✉️ Написать автору
                    </button>
                  </div>
                </div>

              </div>
              
              {/* Футер модалки */}
              <div className="modal-footer bg-light border-0 p-3">
                <button type="button" className="btn btn-secondary btn-sm px-4 rounded-3" onClick={() => { setActiveModalPet(null); setIsPulseActive(false); }}>
                  Закрыть
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;