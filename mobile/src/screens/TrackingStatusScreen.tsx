import type { User } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCoordinates } from "../services/addressing";

type Profile = {
  user: User;
  displayName: string;
  avatarUrl: string | null;
  currentLocation: {
    roomId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    updatedAt: string;
    address: string | null;
  } | null;
  roomIds: string[];
  rooms: {
    id: string;
    name: string;
    inviteCode: string | null;
    sharedPlaylistUrl: string | null;
    memberCount: number;
  }[];
  savedLocations: {
    id: string;
    roomId: string;
    userId: string;
    label: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    address: string | null;
  }[];
  friendLocations: {
    roomId: string;
    roomName: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    updatedAt: string;
    address: string | null;
  }[];
  latestRealtimeNotice: {
    id: string;
    message: string;
    createdAt: string;
  } | null;
  lastSyncedAt: string | null;
  trackingEnabled: boolean;
  savingLocation: boolean;
  syncing: boolean;
  statusMessage: string | null;
};

function formatTime(dateString: string | null) {
  if (!dateString) {
    return "Chua co lan sync nao";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Chua co lan sync nao";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? "")
      .join("") || "MT"
  );
}

const PRESET_LOCATION_LABELS = ["Tro", "Nha", "Truong"];

export default function TrackingStatusScreen({
  profile,
  onStart,
  onStop,
  onRefreshRooms,
  onSaveLocation,
  onSignOut,
}: {
  profile: Profile;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRefreshRooms: () => Promise<void>;
  onSaveLocation: (label: string, roomId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const primaryRoom = profile.rooms[0] ?? null;
  const initials = initialsFromName(profile.displayName);
  const [locationLabel, setLocationLabel] = useState("");
  const primaryRoomSavedLocations = useMemo(
    () =>
      primaryRoom
        ? profile.savedLocations.filter(
            (item) => item.roomId === primaryRoom.id,
          )
        : [],
    [primaryRoom, profile.savedLocations],
  );
  const visibleFriendLocations = useMemo(
    () => profile.friendLocations.slice(0, 8),
    [profile.friendLocations],
  );

  const handleSaveCurrentLocation = async () => {
    if (!primaryRoom || !locationLabel.trim()) {
      return;
    }

    await onSaveLocation(locationLabel, primaryRoom.id);
    setLocationLabel("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <Pressable onPress={() => void onSignOut()} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>X</Text>
          </Pressable>
          <Pressable
            onPress={() => void onRefreshRooms()}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonText}>↻</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {profile.displayName.toUpperCase()}
            </Text>
            <Text style={styles.heroSubtitle}>
              BFF ID: {primaryRoom?.inviteCode ?? profile.user.id.slice(0, 12)}
            </Text>
            <View style={styles.statusChipRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>
                  {profile.trackingEnabled
                    ? "Dang chia se vi tri"
                    : "Dang tat chia se"}
                </Text>
              </View>
              <View style={[styles.statusChip, styles.mutedChip]}>
                <Text style={styles.statusChipText}>
                  Sync {formatTime(profile.lastSyncedAt)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.avatarTile}>
            <Text style={styles.avatarText}>{initials.toLowerCase()}</Text>
          </View>
        </View>

        <View style={styles.quickBanner}>
          <Text style={styles.quickBannerPlus}>+</Text>
          <Text style={styles.quickBannerText}>
            App Expo nay co reverse geocoding, realtime vi tri va thong bao khi
            ban be cap nhat.
          </Text>
        </View>

        {profile.latestRealtimeNotice ? (
          <View style={styles.noticePulseCard}>
            <Text style={styles.sectionTitle}>Thong bao room</Text>
            <Text style={styles.bodyText}>
              {profile.latestRealtimeNotice.message}
            </Text>
            <Text style={styles.subtleMetaText}>
              {`Luc ${formatTime(profile.latestRealtimeNotice.createdAt)}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Dia chi hien tai</Text>
          <Text style={styles.bodyText}>
            {profile.currentLocation?.address ??
              "Chua co vi tri da dong bo de doi sang dia chi."}
          </Text>
          {profile.currentLocation ? (
            <Text style={styles.subtleMetaText}>
              {formatCoordinates({
                latitude: profile.currentLocation.latitude,
                longitude: profile.currentLocation.longitude,
              })}
              {` • Sync ${formatTime(profile.currentLocation.updatedAt)}`}
            </Text>
          ) : (
            <Text style={styles.subtleMetaText}>
              Bat tracking hoac lam moi room de lay vi tri moi nhat.
            </Text>
          )}
        </View>

        {primaryRoom ? (
          <View style={styles.addressCard}>
            <Text style={styles.sectionTitle}>
              Luu dia diem cho {primaryRoom.name}
            </Text>
            <Text style={styles.bodyText}>
              Luu nhanh Tro, Nha, Truong hoac tu dat ten khac. App nay khong
              tinh travel time.
            </Text>
            <View style={styles.presetRow}>
              {PRESET_LOCATION_LABELS.map((preset) => (
                <Pressable
                  disabled={profile.savingLocation || !profile.currentLocation}
                  key={preset}
                  onPress={() => {
                    void onSaveLocation(preset, primaryRoom.id);
                  }}
                  style={[
                    styles.presetButton,
                    (profile.savingLocation || !profile.currentLocation) &&
                      styles.disabledButton,
                  ]}
                >
                  <Text style={styles.presetButtonText}>{preset}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              autoCapitalize="words"
              onChangeText={setLocationLabel}
              placeholder="Vi du: Quan ruot, Thu vien, Ca phe"
              placeholderTextColor="#6f8898"
              style={styles.locationInput}
              value={locationLabel}
            />
            <Pressable
              disabled={
                profile.savingLocation ||
                !profile.currentLocation ||
                !locationLabel.trim()
              }
              onPress={() => {
                void handleSaveCurrentLocation();
              }}
              style={[
                styles.secondarySplitButton,
                (profile.savingLocation ||
                  !profile.currentLocation ||
                  !locationLabel.trim()) &&
                  styles.disabledButton,
              ]}
            >
              {profile.savingLocation ? (
                <ActivityIndicator color="#ecf3fb" />
              ) : (
                <Text style={styles.secondarySplitButtonText}>
                  Luu dia diem nay
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.friendLocationsCard}>
          <Text style={styles.sectionTitle}>Ban be dang o dau</Text>
          <Text style={styles.bodyText}>
            Vi tri nay duoc cap nhat realtime tu bang user_locations trong room
            chung.
          </Text>
          {visibleFriendLocations.length === 0 ? (
            <Text style={styles.subtleMetaText}>
              Chua thay cap nhat vi tri nao tu thanh vien khac.
            </Text>
          ) : (
            visibleFriendLocations.map((location) => (
              <View
                key={`${location.roomId}:${location.userId}`}
                style={styles.friendLocationRow}
              >
                <View style={styles.friendAvatarBadge}>
                  <Text style={styles.friendAvatarBadgeText}>
                    {initialsFromName(location.displayName).toLowerCase()}
                  </Text>
                </View>
                <View style={styles.friendLocationContent}>
                  <Text style={styles.savedLocationAddress}>
                    {location.displayName}
                  </Text>
                  <Text style={styles.bodyText}>
                    {location.address ??
                      formatCoordinates({
                        latitude: location.latitude,
                        longitude: location.longitude,
                      })}
                  </Text>
                  <Text style={styles.subtleMetaText}>
                    {`${location.roomName} • ${formatTime(location.updatedAt)}`}
                    {location.accuracy
                      ? ` • sai so ${Math.round(location.accuracy)}m`
                      : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.journeyCard}>
          <View style={styles.journeyMap}>
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.routeDotStart]} />
            <View style={[styles.routeDot, styles.routeDotEnd]} />
            <Text style={[styles.mapLabel, styles.mapLabelStart]}>Bat dau</Text>
            <Text style={[styles.mapLabel, styles.mapLabelEnd]}>
              {primaryRoom?.name ?? "Chua co room"}
            </Text>
          </View>

          <View style={styles.journeyMeta}>
            <Text style={styles.sectionTitle}>
              {primaryRoom?.name ?? "Room vi tri"}
            </Text>
            <Text style={styles.bodyText}>
              App mobile nay hien thi room, trang thai chia se nen, dia chi da
              reverse geocode va playlist chung neu co.
            </Text>
            <View style={styles.journeyStats}>
              <Text style={styles.statText}>{profile.roomIds.length} room</Text>
              <Text style={styles.statText}>
                {profile.trackingEnabled
                  ? "GPS nen dang chay"
                  : "GPS nen dang tat"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            disabled={profile.syncing || !profile.roomIds.length}
            onPress={() =>
              void (profile.trackingEnabled ? onStop() : onStart())
            }
            style={[
              styles.splitButton,
              (profile.syncing || !profile.roomIds.length) &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.splitButtonText}>
              {profile.trackingEnabled ? "Tat chia se nen" : "Bat chia se nen"}
            </Text>
          </Pressable>
          <Pressable
            disabled={profile.syncing}
            onPress={() => void onRefreshRooms()}
            style={[
              styles.secondarySplitButton,
              profile.syncing && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondarySplitButtonText}>Lam moi room</Text>
          </Pressable>
        </View>

        <View style={styles.savedLocationsCard}>
          <Text style={styles.sectionTitle}>Dia diem da luu</Text>
          <Text style={styles.bodyText}>
            {primaryRoom
              ? `Danh sach dia diem cua room ${primaryRoom.name}.`
              : "Join room truoc de luu va xem dia diem."}
          </Text>

          {primaryRoomSavedLocations.length === 0 ? (
            <Text style={styles.subtleMetaText}>
              Chua co dia diem nao duoc luu.
            </Text>
          ) : (
            primaryRoomSavedLocations.map((location) => (
              <View key={location.id} style={styles.savedLocationRow}>
                <View style={styles.savedLocationBadge}>
                  <Text style={styles.savedLocationBadgeText}>
                    {location.label}
                  </Text>
                </View>
                <View style={styles.savedLocationContent}>
                  <Text style={styles.savedLocationAddress}>
                    {location.address ??
                      formatCoordinates({
                        latitude: location.latitude,
                        longitude: location.longitude,
                      })}
                  </Text>
                  <Text style={styles.subtleMetaText}>
                    {location.userId === profile.user.id
                      ? "Ban luu"
                      : "Thanh vien room luu"}
                    {` • ${formatTime(location.createdAt)}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {profile.rooms.length === 0 ? (
          <View style={[styles.feedCard, styles.emptyCard]}>
            <Text style={styles.sectionTitle}>Chua co room nao</Text>
            <Text style={styles.bodyText}>
              Hay join mot room tu web truoc, sau do app mobile se dung room do
              de gui vi tri nen that.
            </Text>
          </View>
        ) : (
          profile.rooms.map((room) => (
            <View style={styles.feedCard} key={room.id}>
              <View style={styles.feedCardHead}>
                <View style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>
                    {initials.toLowerCase()}
                  </Text>
                </View>
                <View style={styles.feedHeadCopy}>
                  <Text style={styles.sectionTitle}>{room.name}</Text>
                  <Text style={styles.bodyText}>
                    {room.inviteCode
                      ? `Ma ${room.inviteCode}`
                      : "Chua co ma moi"}
                    {` • ${room.memberCount} nguoi`}
                  </Text>
                </View>
              </View>

              <View style={styles.miniMapCard}>
                <Text style={styles.miniMapPin}>{initials.toLowerCase()}</Text>
              </View>

              <View style={styles.feedActions}>
                <Pressable
                  onPress={() => void onRefreshRooms()}
                  style={styles.pillButton}
                >
                  <Text style={styles.pillButtonText}>Lam moi</Text>
                </Pressable>
                {room.sharedPlaylistUrl ? (
                  <Pressable
                    onPress={() => {
                      if (room.sharedPlaylistUrl) {
                        void Linking.openURL(room.sharedPlaylistUrl);
                      }
                    }}
                    style={[styles.pillButton, styles.darkPillButton]}
                  >
                    <Text style={styles.darkPillButtonText}>
                      Playlist chung
                    </Text>
                  </Pressable>
                ) : (
                  <View style={[styles.pillButton, styles.mutedPillButton]}>
                    <Text style={styles.mutedPillButtonText}>
                      Chua co playlist
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={styles.noticeCard}>
          <Text style={styles.sectionTitle}>Luu y native</Text>
          <Text style={styles.noticeLine}>
            Can cap quyen location Always tren iOS.
          </Text>
          <Text style={styles.noticeLine}>
            Can tat battery optimization tren Android neu may bop nen.
          </Text>
          <Text style={styles.noticeLine}>
            Background location chi on dinh tren dev build hoac native build.
          </Text>
        </View>

        {profile.statusMessage ? (
          <Text style={styles.statusText}>{profile.statusMessage}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05101c",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 18,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#122437",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconButtonText: {
    color: "#ecf3fb",
    fontSize: 18,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 28,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    padding: 20,
  },
  heroCopy: {
    flex: 1,
    gap: 10,
  },
  heroTitle: {
    color: "#ecf3fb",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroSubtitle: {
    color: "#9bb6c8",
    fontSize: 14,
    fontWeight: "600",
  },
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    backgroundColor: "#17304d",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mutedChip: {
    backgroundColor: "#24394c",
  },
  statusChipText: {
    color: "#ecf3fb",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarTile: {
    alignItems: "center",
    backgroundColor: "#79d8ff",
    borderRadius: 26,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  avatarText: {
    color: "#07111f",
    fontSize: 24,
    fontWeight: "900",
  },
  quickBanner: {
    alignItems: "center",
    backgroundColor: "#17304d",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  quickBannerPlus: {
    color: "#79d8ff",
    fontSize: 22,
    fontWeight: "900",
  },
  quickBannerText: {
    color: "#cfe0ec",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  addressCard: {
    backgroundColor: "#10233b",
    borderRadius: 24,
    gap: 10,
    padding: 18,
  },
  noticePulseCard: {
    backgroundColor: "#16324b",
    borderRadius: 24,
    gap: 10,
    padding: 18,
  },
  subtleMetaText: {
    color: "#8aa7bb",
    fontSize: 12,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetButton: {
    alignItems: "center",
    backgroundColor: "#214669",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 16,
  },
  presetButtonText: {
    color: "#ecf3fb",
    fontSize: 13,
    fontWeight: "800",
  },
  locationInput: {
    backgroundColor: "#0c1b2d",
    borderColor: "#27435f",
    borderRadius: 16,
    borderWidth: 1,
    color: "#ecf3fb",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  journeyCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 28,
    gap: 18,
    padding: 20,
  },
  journeyMap: {
    backgroundColor: "#0a1625",
    borderRadius: 24,
    height: 180,
    overflow: "hidden",
    position: "relative",
  },
  routeLine: {
    backgroundColor: "#79d8ff",
    borderRadius: 999,
    height: 4,
    left: 34,
    position: "absolute",
    right: 34,
    top: 88,
  },
  routeDot: {
    backgroundColor: "#ecf3fb",
    borderRadius: 11,
    height: 22,
    position: "absolute",
    top: 79,
    width: 22,
  },
  routeDotStart: {
    left: 26,
  },
  routeDotEnd: {
    right: 26,
  },
  mapLabel: {
    color: "#9bb6c8",
    fontSize: 13,
    fontWeight: "700",
    position: "absolute",
    top: 104,
  },
  mapLabelStart: {
    left: 18,
  },
  mapLabelEnd: {
    right: 18,
  },
  journeyMeta: {
    gap: 10,
  },
  sectionTitle: {
    color: "#ecf3fb",
    fontSize: 20,
    fontWeight: "800",
  },
  bodyText: {
    color: "#a7bfd1",
    fontSize: 14,
    lineHeight: 20,
  },
  journeyStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statText: {
    color: "#d8e8f4",
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  splitButton: {
    alignItems: "center",
    backgroundColor: "#79d8ff",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  splitButtonText: {
    color: "#07111f",
    fontSize: 15,
    fontWeight: "800",
  },
  secondarySplitButton: {
    alignItems: "center",
    backgroundColor: "#17304d",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondarySplitButtonText: {
    color: "#ecf3fb",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
  feedCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 24,
    gap: 16,
    padding: 18,
  },
  emptyCard: {
    minHeight: 140,
    justifyContent: "center",
  },
  savedLocationsCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 24,
    gap: 12,
    padding: 18,
  },
  friendLocationsCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 24,
    gap: 12,
    padding: 18,
  },
  savedLocationRow: {
    alignItems: "flex-start",
    backgroundColor: "#10233b",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  savedLocationBadge: {
    backgroundColor: "#79d8ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  savedLocationBadgeText: {
    color: "#07111f",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  savedLocationContent: {
    flex: 1,
    gap: 4,
  },
  savedLocationAddress: {
    color: "#e7f0f7",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  friendLocationRow: {
    alignItems: "flex-start",
    backgroundColor: "#10233b",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  friendAvatarBadge: {
    alignItems: "center",
    backgroundColor: "#79d8ff",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  friendAvatarBadgeText: {
    color: "#07111f",
    fontSize: 13,
    fontWeight: "900",
  },
  friendLocationContent: {
    flex: 1,
    gap: 4,
  },
  feedCardHead: {
    flexDirection: "row",
    gap: 12,
  },
  feedAvatar: {
    alignItems: "center",
    backgroundColor: "#1a344e",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  feedAvatarText: {
    color: "#79d8ff",
    fontSize: 16,
    fontWeight: "900",
  },
  feedHeadCopy: {
    flex: 1,
    gap: 4,
  },
  miniMapCard: {
    alignItems: "center",
    backgroundColor: "#091726",
    borderRadius: 18,
    height: 120,
    justifyContent: "center",
  },
  miniMapPin: {
    color: "#79d8ff",
    fontSize: 18,
    fontWeight: "900",
  },
  feedActions: {
    flexDirection: "row",
    gap: 10,
  },
  pillButton: {
    backgroundColor: "#eaf2f8",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillButtonText: {
    color: "#07111f",
    fontSize: 13,
    fontWeight: "800",
  },
  darkPillButton: {
    backgroundColor: "#183554",
  },
  darkPillButtonText: {
    color: "#ecf3fb",
    fontSize: 13,
    fontWeight: "800",
  },
  mutedPillButton: {
    backgroundColor: "#22384b",
  },
  mutedPillButtonText: {
    color: "#a6bfce",
    fontSize: 13,
    fontWeight: "700",
  },
  noticeCard: {
    backgroundColor: "#122437",
    borderRadius: 24,
    gap: 8,
    padding: 18,
  },
  noticeLine: {
    color: "#cfe0ec",
    fontSize: 14,
    lineHeight: 20,
  },
  statusText: {
    color: "#dbe8f2",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
