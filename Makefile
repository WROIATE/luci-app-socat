# Copyright (C) 2020 Lienol <lawlienol@gmail.com>
# Copyright (C) 2024 WROIATE <j.wroiate@gmail.com>
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-socat
PKG_VERSION:=20250512
PKG_RELEASE:=3

PKG_MAINTAINER:=WROIATE <j.wroiate@gmail.com>

LUCI_TITLE:=LuCI support for Socat
LUCI_DEPENDS:=+socat
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/conffiles
/etc/config/socat
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
