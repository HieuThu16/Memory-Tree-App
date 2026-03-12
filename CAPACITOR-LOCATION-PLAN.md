# Capacitor Background Location Plan

Muc tieu: chuyen phan chia se vi tri tu PWA web sang app mobile dung Capacitor de chay background location that, van giu lai web app hien tai cho desktop va mobile browser.

## Ket luan ngan

- PWA hien tai khong the dam bao lay GPS lien tuc khi app bi dua xuong nen hoac tat man hinh.
- Muon background location that, can co native shell.
- Cach it rui ro nhat voi codebase hien tai la giu Next.js lam backend + web UI, va them mot app Capacitor rieng cho mobile location.

## Vi sao khong nen dong goi truc tiep app Next hien tai thanh local Capacitor app

- Repo dang dung Next.js App Router voi server rendering va route dong.
- Capacitor dong goi tot nhat voi static web assets, con app hien tai phu thuoc runtime server.
- Giai phap nhung nguyen website vao WebView van dung duoc, nhung background location can native plugin va bridge ro rang, nen can mot shell mobile ro rang hon.

## Kien truc de xuat

1. Giu website hien tai tren Vercel lam web app chinh.
2. Tao mot thu muc moi `mobile/` cho Capacitor app.
3. Mobile app co 2 vai tro:
   - Dang nhap va hien thi giao dien location cho nguoi dung.
   - Chay native background location service va dong bo ve Supabase.
4. Web app va mobile app dung chung Supabase project, bang `user_locations`, `location_history`, `saved_locations`.

## De xuat cong nghe

### Phuong an production khuyen nghi

- Capacitor 7
- UI mobile: Vite + React hoac Ionic React
- Background location plugin: `@transistorsoft/capacitor-background-geolocation`

Ly do:

- On dinh nhat cho Android va iOS
- Ho tro background, motion detection, headless task, stopOnTerminate, startOnBoot
- Co kinh nghiem production tot hon cac plugin community

Luu y:

- Plugin nay co licensing, can kiem tra chi phi truoc khi ship production.

### Phuong an tiet kiem chi phi

- Capacitor + plugin community + tu viet them native handling

Nhung phuong an nay tang rui ro:

- Background khong on dinh tren Android OEM
- iOS de bi he dieu hanh giet
- Kho debug hon

## Luong du lieu de xuat

### Foreground

1. App mo: mobile service lang nghe vi tri lien tuc.
2. Moi lan co vi tri moi:
   - upsert `user_locations`
   - neu qua 5 phut va vi tri thay doi du lon, insert `location_history`

### Background

1. Native plugin tiep tuc nhan update khi app xuong nen.
2. Event duoc dua vao queue local.
3. Neu co mang thi dong bo ngay len Supabase.
4. Neu mat mang thi luu local, co mang lai thi flush queue.

## Rule ghi lich su

Rule nen giu thong nhat giua web va mobile:

- realtime update: khi dich chuyen > 10m
- history checkpoint: toi da 1 lan moi 5 phut
- chi insert `location_history` khi:
  - da qua 5 phut tu checkpoint truoc
  - vi tri moi cach checkpoint truoc it nhat 15m

Phan text kieu:

- `Tu 08:00 -> 10:15. Toi da o Tro.`

khong can luu san duoi dang text. Nen tiep tuc:

- luu raw checkpoint vao `location_history`
- khi can xem timeline thi group theo location label va render text

Lam vay de:

- tranh trung lap data
- de doi rule render sau nay
- de phan tich timeline linh hoat hon

## Database thay doi nen bo sung

Bang hien tai da du de MVP, nhung de chay native nghiem tuc nen them 2 bang sau.

### 1. `devices`

Muc dich:

- theo doi moi thiet bi cua user
- biet user dang chay web hay native
- bat/tat tracking theo tung device

Cot goi y:

- `id uuid primary key`
- `user_id uuid not null`
- `platform text not null` -- ios | android | web
- `device_name text null`
- `installation_id text unique not null`
- `is_tracking boolean default false`
- `last_seen_at timestamptz default now()`
- `created_at timestamptz default now()`

### 2. `location_sync_queue` hoac luu local-only

Neu muon don gian, queue nen luu local tren mobile bang SQLite, khong can bang server.

## Auth va bao mat

Can giai quyet 2 viec:

1. Native layer biet `user_id` nao dang tracking.
2. Native layer gui du lieu len Supabase bang session hop le.

De xuat:

- mobile app login truc tiep bang Supabase auth
- luu session trong secure storage cua mobile
- background service doc access token tu secure storage
- push data len Supabase REST hoac Supabase JS

Khong nen:

- embed service role key vao mobile app

## Quyen tren he dieu hanh

### iOS

Can:

- When In Use permission
- Always permission neu muon background that
- Background Modes: Location updates

Can viet ro ly do trong permission text, neu khong App Review de reject.

### Android

Can:

- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- Foreground service permission neu plugin yeu cau

Can thong bao ro voi user vi Android 10+ tach rieng background permission.

## Ke hoach trien khai de xuat

### Phase 1: Tach mobile shell

Muc tieu:

- tao app `mobile/`
- login Supabase
- mo duoc trang location co ban

Cong viec:

1. Tao `mobile/` bang Vite React.
2. Cai Capacitor.
3. Add `android` va `ios`.
4. Cai plugin background location.
5. Ket noi Supabase.

### Phase 2: Background service

Muc tieu:

- khi app xuong nen van gui GPS

Cong viec:

1. Tao `mobile/src/services/locationService.ts`.
2. Start plugin sau khi user bat chia se vi tri.
3. Luu `is_tracking` vao local storage va bang `devices`.
4. Dang ky callback:
   - `onLocation`
   - `onMotionChange`
   - `onProviderChange`
   - `onHeartbeat`
5. Trong callback:
   - upsert `user_locations`
   - conditionally insert `location_history`

### Phase 3: Dong bo timeline va labels

Muc tieu:

- mobile va web dung chung logic timeline

Cong viec:

1. Tach helper group timeline thanh module dung chung.
2. Dong bo `saved_locations` ve mobile.
3. Render timeline tren mobile va web theo cung rule.

### Phase 4: Hardening

Muc tieu:

- chay on tren may that

Cong viec:

1. Test Android background sau khi tat man hinh.
2. Test iOS foreground -> background -> kill app.
3. Test mat mang va flush queue.
4. Them log/diagnostic screen de debug tracking.

## UX de xuat tren mobile

Can them cac state ro rang:

- Dang chia se vi tri lien tuc
- App dang chi chia se khi dang mo
- Thieu quyen background location
- GPS dang tat
- Tiet kiem pin dang chan background

Can them mot man hinh huong dan setup:

- bat Always Location
- tat battery optimization cho app
- cho phep foreground notification neu Android can

## File/thu muc de tao neu bat dau lam

```text
mobile/
  package.json
  capacitor.config.ts
  src/
    main.tsx
    lib/
      supabase.ts
      secureSession.ts
    services/
      backgroundLocation.ts
      locationSync.ts
    screens/
      LoginScreen.tsx
      LocationScreen.tsx
      TrackingStatusScreen.tsx
```

## MVP toi khuyen nghi

MVP dung de validate nhanh:

1. Tao `mobile/` app rieng.
2. Dang nhap Supabase.
3. Bat/tat background location bang native plugin.
4. Dong bo `user_locations` + `location_history`.
5. Web hien thi realtime va timeline nhu hien tai.

Khong nen MVP theo huong:

- co gang ep PWA web hien tai background GPS that

Huong do mat thoi gian ma khong dat duoc muc tieu.

## Uoc luong effort

- Shell mobile + auth: 0.5 -> 1 ngay
- Background location service + sync: 1 -> 2 ngay
- Android/iOS permissions + testing: 1 -> 2 ngay
- Timeline polish + diagnostics: 0.5 -> 1 ngay

Tong thuc te: 3 -> 6 ngay lam viec neu di theo huong plugin production-grade.

## Buoc tiep theo hop ly nhat

Neu bat dau implement, thu tu toi uu la:

1. Scaffold `mobile/` Capacitor app
2. Chon plugin background location
3. Them bang `devices`
4. Ket noi Supabase auth cho mobile
5. Push GPS checkpoint ve `user_locations` va `location_history`
