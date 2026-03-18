import type { User } from "@supabase/supabase-js";
import { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCoordinates } from "../services/addressing";
import type { GlobalFriendshipProfile } from "../services/friendships";
import { sendFriendRequest, acceptFriendRequest, cancelOrUnfriend } from "../services/friendships";

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
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    updatedAt: string | null;
    address: string | null;
  }[];
  locationHistory: {
    id: string;
    userId: string;
    roomId: string;
    latitude: number;
    longitude: number;
    recordedAt: string;
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
  globalFriendProfiles: GlobalFriendshipProfile[];
};

function formatTime(dateString: string | null) {
  if (!dateString) {
    return "Chưa có";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
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

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PRESET_LOCATION_LABELS = ["Trọ", "Nhà", "Trường"];

type Tab = "personal" | "friends" | "history";

export default function TrackingStatusScreen({
  profile,
  onStart,
  onStop,
  onRefreshRooms,
  onSaveLocation,
  onDeleteSavedLocation,
  onSignOut,
}: {
  profile: Profile;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRefreshRooms: () => Promise<void>;
  onSaveLocation: (label: string, roomId: string) => Promise<void>;
  onDeleteSavedLocation: (id: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendSubTab, setFriendSubTab] = useState<"friends"|"requests"|"all">("friends");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const primaryRoom = profile.rooms[0] ?? null;
  const initials = initialsFromName(profile.displayName);

  const primaryRoomSavedLocations = useMemo(
    () =>
      primaryRoom
        ? profile.savedLocations.filter(
            (item) => item.roomId === primaryRoom.id,
          )
        : [],
    [primaryRoom, profile.savedLocations],
  );

  const processedMyHistory = useMemo(() => {
    const rawHistory = profile.locationHistory.filter((h) => h.userId === profile.user.id);
    if (!rawHistory || rawHistory.length === 0) return [];
    
    const sorted = [...rawHistory].sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    
    return sorted.map((item, index) => {
      let prevTime = null;
      let prevAddress = null;
      let distanceKm = 0;
      let isMove = false;
      
      if (index > 0) {
        const prev = sorted[index - 1];
        prevTime = formatTime(prev.recordedAt);
        prevAddress = prev.address || `${prev.latitude.toFixed(4)}, ${prev.longitude.toFixed(4)}`;
        distanceKm = calculateDistanceKm(prev.latitude, prev.longitude, item.latitude, item.longitude);
        if (distanceKm >= 0.02) { 
          isMove = true;
        }
      }
      
      return {
        id: item.id,
        time: formatTime(item.recordedAt),
        address: item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`,
        prevTime,
        prevAddress,
        distanceKm,
        isMove
      };
    }).reverse();
  }, [profile.locationHistory, profile.user.id]);

  const selectedFriend = useMemo(
    () =>
      profile.friendLocations.find((f) => f.userId === selectedFriendId) || null,
    [profile.friendLocations, selectedFriendId],
  );

  const processedFriendHistory = useMemo(() => {
    if (!selectedFriendId) return [];
    const rawHistory = profile.locationHistory.filter((h) => h.userId === selectedFriendId);
    if (!rawHistory || rawHistory.length === 0) return [];
    
    const sorted = [...rawHistory].sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    
    return sorted.map((item, index) => {
      let prevTime = null;
      let prevAddress = null;
      let distanceKm = 0;
      let isMove = false;
      
      if (index > 0) {
        const prev = sorted[index - 1];
        prevTime = formatTime(prev.recordedAt);
        prevAddress = prev.address || `${prev.latitude.toFixed(4)}, ${prev.longitude.toFixed(4)}`;
        distanceKm = calculateDistanceKm(prev.latitude, prev.longitude, item.latitude, item.longitude);
        if (distanceKm >= 0.02) { 
          isMove = true;
        }
      }
      
      return {
        id: item.id,
        time: formatTime(item.recordedAt),
        address: item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`,
        prevTime,
        prevAddress,
        distanceKm,
        isMove
      };
    }).reverse();
  }, [profile.locationHistory, selectedFriendId]);

  const handleSaveCurrentLocation = async () => {
    if (!primaryRoom || !locationLabel.trim()) {
      return;
    }

    await onSaveLocation(locationLabel, primaryRoom.id);
    setLocationLabel("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={() => void onSignOut()} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>X</Text>
          </Pressable>
          <Text style={styles.headerTitle}>MAP</Text>
          <Pressable
            onPress={() => void onRefreshRooms()}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonText}>↻</Text>
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab("personal")}
            style={[styles.tab, activeTab === "personal" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "personal" && styles.activeTabText,
              ]}
            >
              Cá nhân
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("friends")}
            style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "friends" && styles.activeTabText,
              ]}
            >
              Bạn bè
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("history")}
            style={[styles.tab, activeTab === "history" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              Lịch sử
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === "personal" && (
            <View style={styles.tabContent}>
              {/* Profile Card */}
              <View style={styles.heroCard}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>
                    {profile.displayName.toUpperCase()}
                  </Text>
                  <View style={styles.statusChipRow}>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>
                        {profile.trackingEnabled ? "📡 Đang bật" : "💤 Đang tắt"}
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

              {/* Current Location */}
              <View style={styles.addressCard}>
                <Text style={styles.sectionTitle}>Vị trí hiện tại</Text>
                <Text style={styles.bodyText}>
                  {profile.currentLocation?.address ?? "Đang lấy vị trí..."}
                </Text>
                {profile.currentLocation && (
                  <Text style={styles.subtleMetaText}>
                    {profile.currentLocation.latitude.toFixed(5)},{" "}
                    {profile.currentLocation.longitude.toFixed(5)}
                  </Text>
                )}
                <Pressable
                  onPress={() =>
                    void (profile.trackingEnabled ? onStop() : onStart())
                  }
                  style={[
                    styles.actionButton,
                    profile.trackingEnabled
                      ? styles.secondaryButton
                      : styles.primaryButton,
                  ]}
                >
                  <Text
                    style={
                      profile.trackingEnabled
                        ? styles.secondaryButtonText
                        : styles.primaryButtonText
                    }
                  >
                    {profile.trackingEnabled ? "Tắt GPS nền" : "Bật GPS nền"}
                  </Text>
                </Pressable>
              </View>

              {/* CRUD Saved Locations */}
              <View style={styles.addressCard}>
                <Text style={styles.sectionTitle}>Lưu địa điểm</Text>
                <View style={styles.presetRow}>
                  {PRESET_LOCATION_LABELS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => void onSaveLocation(preset, primaryRoom?.id || "")}
                      disabled={!profile.currentLocation || profile.savingLocation}
                      style={[styles.presetButton, (!profile.currentLocation || profile.savingLocation) && styles.disabledButton]}
                    >
                      <Text style={styles.presetButtonText}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.locationInput}
                    placeholder="Tên địa điểm khác..."
                    placeholderTextColor="#6f8898"
                    value={locationLabel}
                    onChangeText={setLocationLabel}
                  />
                  <Pressable
                    onPress={handleSaveCurrentLocation}
                    disabled={!locationLabel.trim() || profile.savingLocation}
                    style={[styles.saveButton, (!locationLabel.trim() || profile.savingLocation) && styles.disabledButton]}
                  >
                    {profile.savingLocation ? (
                      <ActivityIndicator size="small" color="#07111f" />
                    ) : (
                      <Text style={styles.saveButtonText}>Lưu</Text>
                    )}
                  </Pressable>
                </View>

                <View style={styles.savedList}>
                  {primaryRoomSavedLocations.map((loc) => (
                    <View key={loc.id} style={styles.savedLocationRow}>
                      <View style={styles.savedLocationContent}>
                        <Text style={styles.savedLocationLabel}>
                          {loc.label} : <Text style={styles.savedLocationAddr}>{loc.address || "Tọa độ: " + loc.latitude.toFixed(4)}</Text>
                        </Text>
                      </View>
                      {loc.userId === profile.user.id && (
                        <Pressable
                          onPress={() => void onDeleteSavedLocation(loc.id)}
                          style={styles.deleteButton}
                        >
                          <Text style={styles.deleteButtonText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeTab === "friends" && (
            <View style={styles.tabContent}>
              <View style={styles.subTabBar}>
                 <Pressable onPress={() => setFriendSubTab("friends")} style={[styles.subTab, friendSubTab === "friends" && styles.activeSubTab]}>
                   <Text style={[styles.subTabText, friendSubTab === "friends" && styles.activeSubTabText]}>Đã kết bạn</Text>
                 </Pressable>
                 <Pressable onPress={() => setFriendSubTab("requests")} style={[styles.subTab, friendSubTab === "requests" && styles.activeSubTab]}>
                   <Text style={[styles.subTabText, friendSubTab === "requests" && styles.activeSubTabText]}>Lời mời</Text>
                 </Pressable>
                 <Pressable onPress={() => setFriendSubTab("all")} style={[styles.subTab, friendSubTab === "all" && styles.activeSubTab]}>
                   <Text style={[styles.subTabText, friendSubTab === "all" && styles.activeSubTabText]}>Mọi người</Text>
                 </Pressable>
              </View>

              {friendSubTab === "friends" && (
                <>
                  <Text style={styles.sectionTitle}>Danh sách Bạn bè</Text>
                  {profile.globalFriendProfiles.filter(f => f.status === "accepted").length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Bạn chưa có bạn bè nào.</Text>
                    </View>
                  ) : (
                    profile.globalFriendProfiles.filter(f => f.status === "accepted").map((friend) => {
                      const loc = friend.lastLocation;
                      return (
                        <Pressable key={friend.userId} onPress={() => setSelectedFriendId(friend.userId)} style={styles.friendRow}>
                          <View style={styles.friendAvatar}>
                            <Text style={styles.friendAvatarText}>
                              {initialsFromName(friend.displayName).toLowerCase()}
                            </Text>
                          </View>
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>{friend.displayName}</Text>
                            <Text style={styles.friendAddr} numberOfLines={1}>
                              {loc?.lat ? (`Vĩ độ: ${loc.lat.toFixed(4)}, Kinh độ: ${loc.lng.toFixed(4)}`) : "Chưa chia sẻ vị trí"}
                            </Text>
                            <Text style={styles.subtleMetaText}>{formatTime(loc?.updatedAt || null)}</Text>
                          </View>
                          <Pressable 
                            style={styles.actionBtnSecondary}
                            onPress={async () => {
                              if (loadingActionId) return;
                              setLoadingActionId(friend.id);
                              await cancelOrUnfriend(friend.id, profile.user.id);
                              await onRefreshRooms();
                              setLoadingActionId(null);
                            }}
                          >
                            <Text style={styles.actionBtnTextSecondary}>Hủy</Text>
                          </Pressable>
                        </Pressable>
                      );
                    })
                  )}
                </>
              )}

              {friendSubTab === "requests" && (
                <>
                  <Text style={styles.sectionTitle}>Lời mời đã nhận</Text>
                  {profile.globalFriendProfiles.filter(f => f.direction === "received" && f.status === "pending").map((friend) => (
                    <View key={friend.userId} style={styles.friendRow}>
                       <View style={styles.friendAvatar}><Text style={styles.friendAvatarText}>{initialsFromName(friend.displayName)}</Text></View>
                       <View style={styles.friendInfo}>
                         <Text style={styles.friendName}>{friend.displayName}</Text>
                       </View>
                       <View style={{flexDirection: 'row', gap: 6}}>
                         <Pressable style={styles.actionBtnPrimary} onPress={async () => {
                           if (loadingActionId) return;
                           setLoadingActionId(friend.id);
                           await acceptFriendRequest(friend.id, profile.user.id);
                           await onRefreshRooms();
                           setLoadingActionId(null);
                         }}><Text style={styles.actionBtnTextPrimary}>Nhận</Text></Pressable>
                         <Pressable style={styles.actionBtnSecondary} onPress={async () => {
                           if (loadingActionId) return;
                           setLoadingActionId(friend.id);
                           await cancelOrUnfriend(friend.id, profile.user.id);
                           await onRefreshRooms();
                           setLoadingActionId(null);
                         }}><Text style={styles.actionBtnTextSecondary}>Từ chối</Text></Pressable>
                       </View>
                    </View>
                  ))}
                  <Text style={[styles.sectionTitle, {marginTop: 10}]}>Lời mời đã gửi</Text>
                  {profile.globalFriendProfiles.filter(f => f.direction === "sent" && f.status === "pending").map((friend) => (
                    <View key={friend.userId} style={styles.friendRow}>
                       <View style={styles.friendAvatar}><Text style={styles.friendAvatarText}>{initialsFromName(friend.displayName)}</Text></View>
                       <View style={styles.friendInfo}>
                         <Text style={styles.friendName}>{friend.displayName}</Text>
                       </View>
                       <Pressable style={styles.actionBtnSecondary} onPress={async () => {
                           if (loadingActionId) return;
                           setLoadingActionId(friend.id);
                           await cancelOrUnfriend(friend.id, profile.user.id);
                           await onRefreshRooms();
                           setLoadingActionId(null);
                         }}><Text style={styles.actionBtnTextSecondary}>Hủy</Text></Pressable>
                    </View>
                  ))}
                </>
              )}

              {friendSubTab === "all" && (
                <>
                  <Text style={styles.sectionTitle}>Mọi người</Text>
                  {profile.globalFriendProfiles.filter(f => f.status === "none").map((friend) => (
                     <View key={friend.userId} style={styles.friendRow}>
                       <View style={styles.friendAvatar}><Text style={styles.friendAvatarText}>{initialsFromName(friend.displayName)}</Text></View>
                       <View style={styles.friendInfo}>
                         <Text style={styles.friendName}>{friend.displayName}</Text>
                       </View>
                       <Pressable style={styles.actionBtnPrimary} onPress={async () => {
                           if (loadingActionId) return;
                           setLoadingActionId(`add-${friend.userId}`);
                           await sendFriendRequest(friend.userId, profile.user.id);
                           await onRefreshRooms();
                           setLoadingActionId(null);
                         }}><Text style={styles.actionBtnTextPrimary}>+ Thêm</Text></Pressable>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === "history" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Lịch sử di chuyển của bạn</Text>
              {processedMyHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Chưa có lịch sử. Hãy di chuyển để bắt đầu ghi!</Text>
                </View>
              ) : (
                processedMyHistory.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTimeAddr}>{item.time} : {item.address}</Text>
                      
                      {item.isMove && item.prevTime && (
                        <View style={styles.moveInfoBox}>
                          <Text style={styles.moveInfoText}>
                            Từ {item.prevTime} : {item.prevAddress}
                          </Text>
                          <Text style={styles.moveDistanceText}>
                            Quãng đường đi: {item.distanceKm.toFixed(2)} km
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {profile.statusMessage && (
            <Text style={styles.statusText}>{profile.statusMessage}</Text>
          )}
        </ScrollView>
      </View>

      {/* Friend Detail Modal */}
      <Modal
        visible={!!selectedFriendId}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedFriendId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedFriend?.displayName || "Chi tiết"}</Text>
              <Pressable onPress={() => setSelectedFriendId(null)} style={styles.closeModal}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>📍 Vị trí hiện tại</Text>
                <Text style={styles.modalValue}>{selectedFriend?.latitude === null ? "Chưa bật GPS" : (selectedFriend?.address || "Không rõ địa chỉ")}</Text>
                <Text style={styles.subtleMetaText}>
                  Cập nhật: {formatTime(selectedFriend?.updatedAt || null)}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>🛤️ Lịch sử di chuyển</Text>
                {processedFriendHistory.length === 0 ? (
                  <Text style={styles.emptyStateText}>Không có dữ liệu lịch sử.</Text>
                ) : (
                  processedFriendHistory.map((item) => (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyContent}>
                        <Text style={styles.historyTimeAddr}>{item.time} : {item.address}</Text>
                        
                        {item.isMove && item.prevTime && (
                          <View style={styles.moveInfoBox}>
                            <Text style={styles.moveInfoText}>
                              Từ {item.prevTime} : {item.prevAddress}
                            </Text>
                            <Text style={styles.moveDistanceText}>
                              Quãng đường đi: {item.distanceKm.toFixed(2)} km
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05101c",
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "#ecf3fb",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#122437",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonText: {
    color: "#ecf3fb",
    fontSize: 16,
    fontWeight: "800",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#17304d",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#79d8ff",
  },
  tabText: {
    color: "#6f8898",
    fontSize: 14,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#79d8ff",
  },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: "#10233b",
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  activeSubTab: {
    backgroundColor: "#214669",
  },
  subTabText: {
    color: "#6f8898",
    fontSize: 13,
    fontWeight: "700",
  },
  activeSubTabText: {
    color: "#ecf3fb",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  tabContent: {
    gap: 20,
  },
  heroCard: {
    backgroundColor: "#0d1e31",
    borderRadius: 24,
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    color: "#ecf3fb",
    fontSize: 24,
    fontWeight: "900",
  },
  statusChipRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusChip: {
    backgroundColor: "#17304d",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mutedChip: {
    backgroundColor: "#24394c",
  },
  statusChipText: {
    color: "#ecf3fb",
    fontSize: 11,
    fontWeight: "700",
  },
  avatarTile: {
    alignItems: "center",
    backgroundColor: "#79d8ff",
    borderRadius: 20,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarText: {
    color: "#07111f",
    fontSize: 20,
    fontWeight: "900",
  },
  addressCard: {
    backgroundColor: "#10233b",
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: "#ecf3fb",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  bodyText: {
    color: "#a7bfd1",
    fontSize: 14,
    lineHeight: 22,
  },
  subtleMetaText: {
    color: "#6f8898",
    fontSize: 12,
  },
  actionButton: {
    borderRadius: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#79d8ff",
  },
  primaryButtonText: {
    color: "#07111f",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#17304d",
  },
  secondaryButtonText: {
    color: "#ecf3fb",
    fontSize: 15,
    fontWeight: "800",
  },
  presetRow: {
    flexDirection: "row",
    gap: 10,
  },
  presetButton: {
    backgroundColor: "#214669",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  presetButtonText: {
    color: "#ecf3fb",
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  locationInput: {
    flex: 1,
    backgroundColor: "#0c1b2d",
    borderRadius: 12,
    color: "#ecf3fb",
    paddingHorizontal: 14,
    height: 44,
  },
  saveButton: {
    backgroundColor: "#79d8ff",
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#07111f",
    fontWeight: "800",
  },
  savedList: {
    marginTop: 10,
    gap: 10,
  },
  savedLocationRow: {
    flexDirection: "row",
    backgroundColor: "#17304d",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  savedLocationContent: {
    flex: 1,
  },
  savedLocationLabel: {
    color: "#ecf3fb",
    fontSize: 15,
    fontWeight: "700",
  },
  savedLocationAddr: {
    color: "#6f8898",
    fontSize: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0d1e31",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#ff5e5e",
    fontWeight: "800",
  },
  friendRow: {
    flexDirection: "row",
    backgroundColor: "#10233b",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#79d8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "900",
  },
  friendInfo: {
    flex: 1,
    marginLeft: 14,
  },
  friendName: {
    color: "#ecf3fb",
    fontSize: 16,
    fontWeight: "700",
  },
  actionBtnPrimary: {
    backgroundColor: "#79d8ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSecondary: {
    backgroundColor: "#214669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnTextPrimary: {
    color: "#07111f",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnTextSecondary: {
    color: "#ecf3fb",
    fontSize: 12,
    fontWeight: "700",
  },
  friendAddr: {
    color: "#a7bfd1",
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: "#6f8898",
    fontSize: 24,
    marginLeft: 10,
  },
  historyRow: {
    flexDirection: "row",
    paddingLeft: 4,
    marginBottom: 16,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#79d8ff",
    marginTop: 6,
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#17304d",
    paddingLeft: 20,
    marginLeft: -21,
    paddingBottom: 4,
  },
  historyTimeAddr: {
    color: "#ecf3fb",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  moveInfoBox: {
    marginTop: 6,
    backgroundColor: "#17304d",
    padding: 10,
    borderRadius: 8,
  },
  moveInfoText: {
    color: "#a7bfd1",
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  moveDistanceText: {
    color: "#79d8ff",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#6f8898",
    textAlign: "center",
    fontSize: 14,
  },
  statusText: {
    color: "#79d8ff",
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#05101c",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: "80%",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#ecf3fb",
    fontSize: 22,
    fontWeight: "900",
  },
  closeModal: {
    backgroundColor: "#17304d",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalText: {
    color: "#ecf3fb",
    fontSize: 16,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 28,
  },
  modalLabel: {
    color: "#79d8ff",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  modalValue: {
    color: "#ecf3fb",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
});
