# Memory Tree Mobile

Expo app cho auth, room context, playlist state, realtime location va background location.

## Bat dau

```bash
npm install
npm run start
npm run start:lan
```

Neu `start:tunnel` loi do ngrok, uu tien dung `npm run start:lan`. Chi dung `start:localhost` khi test tren chinh may do.

## Chay native

```bash
npm run android
npm run ios
```

## Build APK noi bo

```bash
npm run apk
```

## Ghi chu

- App nay dung chung Supabase voi web app.
- Ban mobile co preset luu nhanh `Tro`, `Nha`, `Truong` va label tuy chinh.
- Redirect auth mobile mac dinh: `memorytree://auth/callback`.
- Background location trong Expo can dev build/native build, khong nen ky vong day du tren Expo Go.
- Logic GPS nen dong bo vao `user_locations` va `location_history` nhu web/backend hien co.
- Mobile subscribe realtime `user_locations` va `saved_locations`; local notification se bao khi ban be cap nhat vi tri trong room.
