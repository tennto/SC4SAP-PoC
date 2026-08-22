class ZCL_S4SAP_CM_ALV definition
  public
  create public .

public section.

  interfaces ZIF_S4SAP_CM .

  types:
    BEGIN OF ty_top_of_pages,
            CONTAINER   TYPE REF TO CL_GUI_DOCKING_CONTAINER,
            HTML_VIEWER TYPE REF TO CL_GUI_HTML_VIEWER,
            DD_DOCUMENT TYPE REF TO CL_DD_DOCUMENT,
          END OF ty_top_of_pages .
  types:
    BEGIN OF ty_tree_mode,
            node_selection_mode type i,
            item_selection_mode type abap_bool,
            no_html_header      type abap_bool,
            no_toolbar          type abap_bool,
          END OF ty_tree_mode .
  types:
    BEGIN OF TY_OALV,
            REPID TYPE SY-REPID,
            DYNNR TYPE SY-DYNNR,
            ROW   TYPE I,
            COLUMN TYPE I,
            DOCKING_CONTAINER TYPE REF TO CL_GUI_DOCKING_CONTAINER,
            CUSTOM_CONTAINER TYPE REF TO CL_GUI_CUSTOM_CONTAINER,
            CONTAINER TYPE REF TO CL_GUI_CONTAINER,
            GRID TYPE REF TO ZCL_S4SAP_CM_OALV,
            FIELDCAT TYPE LVC_T_FCAT,
            LAYOUT TYPE LVC_S_LAYO,
            SORT TYPE LVC_T_SORT,
            F4   TYPE LVC_T_F4,
            TOOLBAR_EXCLUSION TYPE UI_FUNCTIONS,
            QUICKINFO TYPE alv_t_qinf,
            FILTER TYPE LVC_T_FILT,
            SAVEMODE TYPE CHAR1,
            VARIANT TYPE disvariant,
            SETEDIT TYPE ABAP_BOOL,
            REGISTER_EVENTS TYPE LVC_T_ROWS,
            TOPOFPAGES    TYPE ty_top_of_pages,
            HANDLER_EVENTS  TYPE REF TO ZCL_S4SAP_CM_ALV_EVENT,
          END OF TY_OALV .
  types:
    BEGIN OF TY_OTREE,
            REPID TYPE SY-REPID,
            DYNNR TYPE SY-DYNNR,
            ROW   TYPE I,
            COLUMN TYPE I,
            DOCKING_CONTAINER TYPE REF TO CL_GUI_DOCKING_CONTAINER,
            CUSTOM_CONTAINER TYPE REF TO CL_GUI_CUSTOM_CONTAINER,
            CONTAINER TYPE REF TO CL_GUI_CONTAINER,
            TREE TYPE REF TO CL_GUI_ALV_TREE,
            OPTION TYPE ty_tree_mode,
            HIERARCHY_HEADER TYPE treev_hhdr,
            LIST_COMMENTARY TYPE slis_t_listheader,
            LOGO TYPE sdydo_value,
            EXCEPTIONFIELD TYPE LVC_S_L004,
            FIELDCAT TYPE LVC_T_FCAT,
            QUICKINFO TYPE alv_t_qinf,
            TOOLBAR_EXCLUSION  TYPE UI_FUNCTIONS,
            FILTER TYPE LVC_T_FILT,
            SAVEMODE TYPE CHAR1,
            VARIANT TYPE disvariant,
            HANDLER_EVENTS  TYPE REF TO ZCL_S4SAP_CM_TREE_EVENT,
          END OF TY_OTREE .
  types:
    BEGIN OF ty_container,
            REPID TYPE SY-REPID,
            DYNNR TYPE SY-DYNNR,
            parent type ref to cl_gui_docking_container,
            splitter type ref to cl_gui_splitter_container,
            id  type i,
            row type i,
            column type i,
            height type i,
            width type i,
            DOCKING_CONTAINER TYPE REF TO CL_GUI_DOCKING_CONTAINER,
            CUSTOM_CONTAINER TYPE REF TO CL_GUI_CUSTOM_CONTAINER,
            CONTAINER TYPE REF TO CL_GUI_CONTAINER,
          END OF ty_container .

  data:
    MT_OALV TYPE TABLE OF TY_OALV .
  data:
    MT_OTREE TYPE TABLE OF TY_OTREE .
  data:
    MT_CONTAINER TYPE TABLE OF TY_CONTAINER .
  data MV_UCOMM type SY-UCOMM .
  data MO_ALV_EVENT type ref to ZCL_S4SAP_CM_ALV_EVENT .
  data MO_TREE_EVENT type ref to ZCL_S4SAP_CM_TREE_EVENT .
  data MV_DYNNR type SY-DYNNR .

  methods CREATE_ALV_GRID
    importing
      !IO_PARENT type ref to CL_GUI_CONTAINER optional
      !IO_PARENT_DOCK type ref to CL_GUI_DOCKING_CONTAINER optional
      !IO_PARENT_CUST type ref to CL_GUI_CUSTOM_CONTAINER optional
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_ROW type I default 1
      !IV_COLUMN type I default 1
    returning
      value(RO_OALV) type ref to ZCL_S4SAP_CM_OALV
    raising
      ZCX_S4SAP_EXCP .
  methods CREATE_ALV_TREE
    importing
      !IO_PARENT type ref to CL_GUI_CONTAINER optional
      !IO_PARENT_DOCK type ref to CL_GUI_DOCKING_CONTAINER optional
      !IO_PARENT_CUST type ref to CL_GUI_CUSTOM_CONTAINER optional
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_ROW type I default 1
      !IV_COLUMN type I default 1
      !IV_SELECTION_MODE type I default CL_GUI_COLUMN_TREE=>NODE_SEL_MODE_SINGLE
      !IV_ITEM_SELECTION type ABAP_BOOL default ABAP_TRUE
      !IV_NO_HTML_HEADER type ABAP_BOOL default ABAP_TRUE
      !IV_NO_TOOLBAR type ABAP_BOOL default ABAP_TRUE
    returning
      value(RO_OTREE) type ref to ZCL_S4SAP_CM_OTREE
    raising
      ZCX_S4SAP_EXCP .
  class-methods GET_FIELDCAT
    importing
      !IT_DATA type STANDARD TABLE optional
      !IV_TABNAME type TABNAME optional
    returning
      value(RT_FCAT) type LVC_T_FCAT .
  methods CREATE_DOCK_CONTAINER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_EXTENSION type I default 4000
      !IV_SIDE type I default CL_GUI_DOCKING_CONTAINER=>DOCK_AT_TOP
      !IV_ROW type I default 1
      !IV_COLUMN type I default 1
    returning
      value(RO_DOCK_CONTAINER) type ref to CL_GUI_DOCKING_CONTAINER .
  methods CREATE_CUST_CONTAINER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_CONTAINER_NAME type CSEQUENCE
    returning
      value(RO_CUST_CONTAINER) type ref to CL_GUI_CUSTOM_CONTAINER .
  methods CREATE_SPLIT_CONTAINER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_EXTENSION type I default 4000
      !IV_ROWS type I
      !IV_COLUMNS type I
    exporting
      value(EO_CONTAINER_01) type ref to CL_GUI_CONTAINER
      value(EO_CONTAINER_02) type ref to CL_GUI_CONTAINER
      value(EO_CONTAINER_03) type ref to CL_GUI_CONTAINER
      value(EO_CONTAINER_04) type ref to CL_GUI_CONTAINER
    raising
      ZCX_S4SAP_EXCP .
  methods DISPLAY_ALV
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
    changing
      !IT_DATA type ANY TABLE
    raising
      ZCX_S4SAP_EXCP .
  methods SET_FIELDCAT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IT_FCAT type LVC_T_FCAT
      !IV_ROW type I optional
      !IV_COLUMN type I optional .
  methods SET_LAYOUT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IS_LAYOUT type LVC_S_LAYO .
  methods SET_EXCLUDING
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_TYPE type CHAR01 default '1' .
  methods SET_SORT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_SORT type LVC_T_SORT .
  methods SET_F4
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_F4 type LVC_T_F4 .
  methods SET_QUICKINFO
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_QUICKINFO type ALV_T_QINF .
  methods SET_FILTER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_FILTER type LVC_T_FILT .
  methods SET_TOP_OF_PAGE
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_SIZE type I default 45
      !IV_TYPE type CHAR1 default '1'
    exporting
      !EO_DOCK type ref to CL_GUI_DOCKING_CONTAINER
      !EO_HTML type ref to CL_GUI_HTML_VIEWER
      !EO_DOCUMENT type ref to CL_DD_DOCUMENT .
  methods SET_REGISTER_EVENT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_ENTER type ABAP_BOOL default SPACE
      !IV_MODIFIED type ABAP_BOOL default SPACE .
  methods SET_READY_FOR_INPUT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_INPUT type ABAP_BOOL default ABAP_FALSE .
  methods SET_DROP_EXTERNAL
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_ACCEPT_FILES type I default 1 .
  methods SET_EVENT_HANDLER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IO_EVENT type ref to ZCL_S4SAP_CM_ALV_EVENT .
  methods SET_CONTAINER_WIDTH
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I default 1
      !IV_COLUMN type I default 1
      !IV_WIDTH type I default 30 .
  methods SET_CONTAINER_HEIGHT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I default 1
      !IV_COLUMN type I default 1
      !IV_HEIGHT type I default 20 .
  methods SET_TREE_HEADER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IS_HIERARCHY_HEADER type TREEV_HHDR
      !IT_LIST_COMMENTARY type SLIS_T_LISTHEADER optional
      !IV_LOGO type SDYDO_VALUE default SPACE .
  methods SET_TREE_FIELDCAT
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_FCAT type LVC_T_FCAT .
  methods DISPLAY_TREE
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
    changing
      !IT_DATA type ANY TABLE
    raising
      ZCX_S4SAP_EXCP .
  methods SET_TREE_EXCLUDING
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_TYPE type CHAR01 default '1' .
  methods SET_TREE_QUICKINFO
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_QINFO type LVC_T_QINF .
  methods SET_TREE_FILTER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IT_FILTER type LVC_T_FILT .
  methods SET_TREE_EVENT_HANDLER
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IO_EVENT type ref to ZCL_S4SAP_CM_TREE_EVENT .
  methods SET_TREE_ADD_NODE
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_RELAT_NODE_KEY type LVC_NKEY optional
      !IV_RELATIONSHIP type I default CL_GUI_COLUMN_TREE=>RELAT_LAST_CHILD
      !IV_NODE_TEXT type LVC_VALUE
      !IS_OUTTAB_LINE type ANY
      !IS_NODE_LAYOUT type LVC_S_LAYN optional
      !IT_ITEM_LAYOUT type LVC_T_LAYI
    returning
      value(RV_NEW_NODE_KEY) type LVC_NKEY .
  methods REFRESH_ALV
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IS_STABLE type LVC_S_STBL optional .
  methods REFRESH_TREE
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_DYNNR type SY-DYNNR default SY-DYNNR
      !IV_ROW type I optional
      !IV_COLUMN type I optional
      !IV_COLUMNOPTIMIZATION type ABAP_BOOL default ABAP_TRUE .
protected section.
private section.

  data MV_ROW type I .
  data MV_COLUMN type I .
ENDCLASS.



CLASS ZCL_S4SAP_CM_ALV IMPLEMENTATION.


    method CREATE_ALV_GRID.

      DATA : LO_OALV TYPE REF TO ZCL_S4SAP_CM_OALV.

      IF IO_PARENT IS BOUND.
        LO_OALV = NEW #( I_PARENT = IO_PARENT ).
      ELSEIF IO_PARENT_DOCK IS BOUND.
        LO_OALV = NEW #( I_PARENT = IO_PARENT_DOCK ).
      ELSEIF IO_PARENT_CUST IS BOUND.
        LO_OALV = NEW #( I_PARENT = IO_PARENT_CUST ).
      ELSE.
        READ TABLE MT_CONTAINER WITH KEY REPID = IV_REPID
                                         DYNNR = IV_DYNNR
                                         ROW   = IV_ROW
                                         COLUMN = IV_COLUMN
                                         ASSIGNING FIELD-SYMBOL(<FS_CONTAINER>).
        IF SY-SUBRC = 0.

          IF <FS_CONTAINER>-CONTAINER IS BOUND.
            LO_OALV = NEW #( I_PARENT = <FS_CONTAINER>-CONTAINER ).
          ELSEIF <FS_CONTAINER>-DOCKING_CONTAINER IS BOUND.
            LO_OALV = NEW #( I_PARENT = <FS_CONTAINER>-DOCKING_CONTAINER ).
          ELSEIF <FS_CONTAINER>-CUSTOM_CONTAINER IS BOUND.
            LO_OALV = NEW #( I_PARENT = <FS_CONTAINER>-CUSTOM_CONTAINER ).
          ENDIF.

        ENDIF.

      ENDIF.

      IF LO_OALV IS BOUND.

        LO_OALV->MV_DYNNR = IV_DYNNR.
        LO_OALV->MV_REPID = IV_REPID.

        MT_OALV = VALUE #( BASE MT_OALV
                          ( REPID = IV_REPID
                            DYNNR = IV_DYNNR
                            ROW   = IV_ROW
                            COLUMN = IV_COLUMN
                            CONTAINER = COND #( WHEN IO_PARENT IS NOT INITIAL THEN IO_PARENT )
                            DOCKING_CONTAINER = COND #( WHEN IO_PARENT_DOCK IS NOT INITIAL THEN IO_PARENT_DOCK )
                            CUSTOM_CONTAINER = COND #( WHEN IO_PARENT_CUST IS NOT INITIAL THEN IO_PARENT_CUST )
                            GRID  = LO_OALV
                           ) ).

        RO_OALV = LO_OALV.

        MV_ROW = IV_ROW.
        MV_COLUMN = IV_COLUMN.
      ELSE.
        ZCX_S4SAP_EXCP=>RAISE( iv_message = 'Cannot Create Grid' ).
      ENDIF.

    ENDMETHOD.


  method CREATE_ALV_TREE.


      DATA : LO_OTREE TYPE REF TO ZCL_S4SAP_CM_OTREE.

      IF IO_PARENT IS BOUND.
        LO_OTREE = NEW #( PARENT = IO_PARENT
                          NODE_SELECTION_MODE = IV_SELECTION_MODE
                          ITEM_SELECTION      = IV_ITEM_SELECTION
                          NO_HTML_HEADER      = IV_NO_HTML_HEADER
                          NO_TOOLBAR          = IV_NO_TOOLBAR ).
      ELSEIF IO_PARENT_DOCK IS BOUND.
        LO_OTREE = NEW #( PARENT = IO_PARENT_DOCK
                          NODE_SELECTION_MODE = IV_SELECTION_MODE
                          ITEM_SELECTION      = IV_ITEM_SELECTION
                          NO_HTML_HEADER      = IV_NO_HTML_HEADER
                          NO_TOOLBAR          = IV_NO_TOOLBAR ).
      ELSEIF IO_PARENT_CUST IS BOUND.
        LO_OTREE = NEW #( PARENT = IO_PARENT_CUST
                          NODE_SELECTION_MODE = IV_SELECTION_MODE
                          ITEM_SELECTION      = IV_ITEM_SELECTION
                          NO_HTML_HEADER      = IV_NO_HTML_HEADER
                          NO_TOOLBAR          = IV_NO_TOOLBAR ).
      ELSE.
        READ TABLE MT_CONTAINER WITH KEY REPID = IV_REPID
                                         DYNNR = IV_DYNNR
                                         ROW   = IV_ROW
                                         COLUMN = IV_COLUMN
                                         ASSIGNING FIELD-SYMBOL(<FS_CONTAINER>).
        IF SY-SUBRC = 0.

          IF <FS_CONTAINER>-CONTAINER IS BOUND.
            LO_OTREE = NEW #( PARENT = <FS_CONTAINER>-CONTAINER
                              NODE_SELECTION_MODE = IV_SELECTION_MODE
                              ITEM_SELECTION      = IV_ITEM_SELECTION
                              NO_HTML_HEADER      = IV_NO_HTML_HEADER
                              NO_TOOLBAR          = IV_NO_TOOLBAR ).
          ELSEIF <FS_CONTAINER>-DOCKING_CONTAINER IS BOUND.
            LO_OTREE = NEW #( PARENT = <FS_CONTAINER>-DOCKING_CONTAINER
                              NODE_SELECTION_MODE = IV_SELECTION_MODE
                              ITEM_SELECTION      = IV_ITEM_SELECTION
                              NO_HTML_HEADER      = IV_NO_HTML_HEADER
                              NO_TOOLBAR          = IV_NO_TOOLBAR ).
          ELSEIF <FS_CONTAINER>-CUSTOM_CONTAINER IS BOUND.
            LO_OTREE = NEW #( PARENT = <FS_CONTAINER>-CUSTOM_CONTAINER
                              NODE_SELECTION_MODE = IV_SELECTION_MODE
                              ITEM_SELECTION      = IV_ITEM_SELECTION
                              NO_HTML_HEADER      = IV_NO_HTML_HEADER
                              NO_TOOLBAR          = IV_NO_TOOLBAR ).
          ENDIF.

        ENDIF.

      ENDIF.

      IF LO_OTREE IS BOUND.

        LO_OTREE->MV_DYNNR = IV_DYNNR.
        LO_OTREE->MV_REPID = IV_REPID.

        MT_OTREE = VALUE #( BASE MT_OTREE
                          ( REPID = IV_REPID
                            DYNNR = IV_DYNNR
                            ROW   = IV_ROW
                            COLUMN = IV_COLUMN
                            CONTAINER = COND #( WHEN IO_PARENT IS NOT INITIAL THEN IO_PARENT )
                            DOCKING_CONTAINER = COND #( WHEN IO_PARENT_DOCK IS NOT INITIAL THEN IO_PARENT_DOCK )
                            CUSTOM_CONTAINER = COND #( WHEN IO_PARENT_CUST IS NOT INITIAL THEN IO_PARENT_CUST )
                            TREE  = LO_OTREE
                           ) ).

        RO_OTREE = LO_OTREE.

        MV_ROW = IV_ROW.
        MV_COLUMN = IV_COLUMN.
      ELSE.
        ZCX_S4SAP_EXCP=>RAISE( IV_MESSAGE = 'Cannot Create Tree' ).
      ENDIF.


  endmethod.


  METHOD CREATE_CUST_CONTAINER.


    RO_CUST_CONTAINER = NEW #( REPID = IV_REPID
                               DYNNR = IV_DYNNR
                               CONTAINER_NAME = IV_CONTAINER_NAME
                             ).
    IF RO_CUST_CONTAINER IS NOT INITIAL.
      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                     REPID = IV_REPID
                     DYNNR = IV_DYNNR
                     ( CUSTOM_CONTAINER = RO_CUST_CONTAINER
                       ID     = 1
                       ROW = 1
                       COLUMN = 1 )
                            ).
    ENDIF.



*            parent type ref to cl_gui_docking_container,
*            splitter type ref to cl_gui_splitter_container,
*            row type i,
*            column type i,
*            height type i,
*            width type i,
*            DOCKING_CONTAINER TYPE REF TO CL_GUI_DOCKING_CONTAINER,
*            CUSTOM_CONTAINER TYPE REF TO CL_GUI_CUSTOM_CONTAINER,
*            CONTAINER TYPE REF TO CL_GUI_CONTAINER,

  ENDMETHOD.


  method CREATE_DOCK_CONTAINER.


    RO_DOCK_CONTAINER = NEW #( repid = iv_repid
                               dynnr = iv_dynnr
                               extension = iv_extension
                               side = iv_side
                             ).
    IF RO_DOCK_CONTAINER IS NOT INITIAL.
      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                     repid = iv_repid
                     dynnr = iv_dynnr
                     ( DOCKING_CONTAINER = RO_DOCK_CONTAINER
                       ID     = 1
                       ROW = IV_ROW
                       COLUMN = IV_COLUMN )
                            ).
    ENDIF.



  endmethod.


  METHOD CREATE_SPLIT_CONTAINER.

    IF IV_ROWS > 3 OR IV_COLUMNS > 3.
      ZCX_S4SAP_EXCP=>RAISE( IV_MESSAGE = 'No more than 3 row or column' ).
    ENDIF.


    DATA(LO_DOCK) = NEW CL_GUI_DOCKING_CONTAINER( REPID = IV_REPID
                           DYNNR = IV_DYNNR
                           EXTENSION = 4000 ).

    MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                            ( REPID = IV_REPID
                              DYNNR = IV_DYNNR
                              DOCKING_CONTAINER = LO_DOCK ) ).


    DATA(LO_SPLITTER) = NEW CL_GUI_SPLITTER_CONTAINER(
                         PARENT = LO_DOCK
                         ROWS   = IV_ROWS
                         COLUMNS = IV_COLUMNS ).

    EO_CONTAINER_01 = LO_SPLITTER->GET_CONTAINER( ROW = 1 COLUMN = 1 ).
    MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                            ( REPID = IV_REPID
                              DYNNR = IV_DYNNR
                              SPLITTER = LO_SPLITTER
                              PARENT = LO_DOCK
                              CONTAINER = EO_CONTAINER_01
                              ID     = 1
                              ROW    = 1
                              COLUMN = 1
                             ) ).

    IF IV_COLUMNS = 1 AND IV_ROWS = 2.
      EO_CONTAINER_02 = LO_SPLITTER->GET_CONTAINER( COLUMN = 1 ROW = 2  ).
      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_02
                                ID     = 2
                                COLUMN = 1
                                ROW    = 2
                               ) ).
    ELSEIF IV_COLUMNS = 2 AND IV_ROWS = 1.
      EO_CONTAINER_02 = LO_SPLITTER->GET_CONTAINER( COLUMN = 2 ROW = 1  ).
      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_02
                                ID     = 2
                                COLUMN = 2
                                ROW    = 1
                               ) ).
    ELSEIF IV_COLUMNS = 2 AND IV_ROWS = 2.
      EO_CONTAINER_02 = LO_SPLITTER->GET_CONTAINER( COLUMN = 1 ROW = 2  ).
      EO_CONTAINER_03 = LO_SPLITTER->GET_CONTAINER( COLUMN = 2 ROW = 1  ).
      EO_CONTAINER_04 = LO_SPLITTER->GET_CONTAINER( COLUMN = 2 ROW = 2  ).

      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_02
                                ID     = 2
                                COLUMN = 1
                                ROW    = 2
                               )
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_03
                                ID     = 3
                                COLUMN = 2
                                ROW    = 1
                               )
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_04
                                ID     = 4
                                COLUMN = 2
                                ROW    = 2
                               )
                            ).
    ELSEIF IV_COLUMNS = 3 AND IV_ROWS = 1.
      EO_CONTAINER_02 = LO_SPLITTER->GET_CONTAINER( COLUMN = 2 ROW = 1  ).
      EO_CONTAINER_03 = LO_SPLITTER->GET_CONTAINER( COLUMN = 3 ROW = 1  ).

      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_02
                                ID     = 2
                                COLUMN = 2
                                ROW    = 1
                               )
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_03
                                ID     = 3
                                COLUMN = 3
                                ROW    = 1
                               )
                            ).
    ELSEIF IV_COLUMNS = 1 AND IV_ROWS = 3.
      EO_CONTAINER_02 = LO_SPLITTER->GET_CONTAINER( COLUMN = 1 ROW = 2  ).
      EO_CONTAINER_03 = LO_SPLITTER->GET_CONTAINER( COLUMN = 1 ROW = 3  ).
      MT_CONTAINER = VALUE #( BASE MT_CONTAINER
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_02
                                ID     = 2
                                COLUMN = 1
                                ROW    = 2
                               )
                              ( REPID = IV_REPID
                                DYNNR = IV_DYNNR
                                SPLITTER = LO_SPLITTER
                                PARENT = LO_DOCK
                                CONTAINER = EO_CONTAINER_03
                                ID     = 3
                                COLUMN = 1
                                ROW    = 3
                               )
                            ).
    ELSE.
      ZCX_S4SAP_EXCP=>RAISE( IV_MESSAGE = 'Why you set with so many containers?' ).
    ENDIF.




  ENDMETHOD.


  method DISPLAY_ALV.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV ASSIGNING FIELD-SYMBOL(<fs_oalv>)
                       WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN.

    IF SY-SUBRC <> 0.
      ZCX_S4SAP_EXCP=>RAISE( iv_message = 'Cannot Fetch Grid in display' ).
    ENDIF.

    CHECK <fs_oalv>-grid IS BOUND.

    IF <fs_oalv>-F4 IS NOT INITIAL.
      <fs_oalv>-grid->REGISTER_F4_FOR_FIELDS( it_f4 = <fs_oalv>-f4 ).
    ENDIF.

    IF <fs_oalv>-VARIANT IS INITIAL.
      <fs_oalv>-VARIANT = iv_repid.
    ENDIF.

    IF <fs_oalv>-SAVEMODE IS INITIAL.
      <fs_oalv>-SAVEMODE = 'A'.
    ENDIF.


    <fs_oalv>-grid->SET_TABLE_FOR_FIRST_DISPLAY(
      EXPORTING
        I_DEFAULT = abap_true
        IS_LAYOUT = <fs_oalv>-LAYOUT
        IS_VARIANT = <fs_oalv>-VARIANT
        I_SAVE    = <fs_oalv>-SAVEMODE
        IT_TOOLBAR_EXCLUDING = <fs_oalv>-TOOLBAR_EXCLUSION
        IT_EXCEPT_QINFO = <fs_oalv>-QUICKINFO
      CHANGING
        IT_FIELDCATALOG = <fs_oalv>-FIELDCAT
        IT_SORT         = <fs_oalv>-SORT
        IT_FILTER       = <fs_oalv>-FILTER
        IT_OUTTAB       = IT_DATA
      EXCEPTIONS
        invalid_parameter_combination = 1
        program_error                 = 2
        too_many_lines                = 3
        OTHERS                        = 4 ).



  endmethod.


  METHOD DISPLAY_TREE.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.


    READ TABLE MT_OTREE ASSIGNING FIELD-SYMBOL(<FS_OTREE>)
                                  WITH KEY REPID = IV_REPID
                                           DYNNR = IV_DYNNR
                                           ROW   = LV_ROW
                                           COLUMN = LV_COLUMN.
    IF SY-SUBRC <> 0.
      ZCX_S4SAP_EXCP=>RAISE( iv_message = 'Cannot Fetch Tree in display' ).
    ENDIF.

    CHECK <FS_OTREE>-TREE IS BOUND.

    IF <FS_OTREE>-VARIANT IS INITIAL.
      <FS_OTREE>-VARIANT = IV_REPID.
    ENDIF.

    IF <FS_OTREE>-SAVEMODE IS INITIAL.
      <FS_OTREE>-SAVEMODE = 'A'.
    ENDIF.


    <FS_OTREE>-TREE->SET_TABLE_FOR_FIRST_DISPLAY(
      EXPORTING
        IS_HIERARCHY_HEADER = <FS_OTREE>-HIERARCHY_HEADER
        IT_LIST_COMMENTARY  = <FS_OTREE>-LIST_COMMENTARY
        I_LOGO              = <FS_OTREE>-LOGO
        IS_VARIANT          = <FS_OTREE>-VARIANT
        I_SAVE              = <FS_OTREE>-SAVEMODE
        IS_EXCEPTION_FIELD  = <FS_OTREE>-EXCEPTIONFIELD
        IT_TOOLBAR_EXCLUDING = <FS_OTREE>-TOOLBAR_EXCLUSION
        IT_EXCEPT_QINFO     = <FS_OTREE>-QUICKINFO
        i_background_id     = 'ALV_BACKGROUND'
      CHANGING
        IT_FIELDCATALOG = <FS_OTREE>-FIELDCAT
        IT_FILTER       = <FS_OTREE>-FILTER
        IT_OUTTAB       = IT_DATA
        ).

  ENDMETHOD.


  method GET_FIELDCAT.

    IF IV_TABNAME IS NOT INITIAL.

      CALL FUNCTION 'LVC_FIELDCATALOG_MERGE'
        EXPORTING
          I_STRUCTURE_NAME       = IV_TABNAME "Structure name
          I_CLIENT_NEVER_DISPLAY = 'X'
        CHANGING
          CT_FIELDCAT            = RT_FCAT
        EXCEPTIONS
          INCONSISTENT_INTERFACE = 1
          PROGRAM_ERROR          = 2
          OTHERS                 = 3.

    ELSEIF IT_DATA IS NOT INITIAL.

      DATA : lo_table TYPE REF TO data.
      CREATE DATA lo_table LIKE it_data.
      ASSIGN lo_table->* TO FIELD-SYMBOL(<fo_table>).

      TRY.
          cl_salv_table=>factory( IMPORTING r_salv_table = DATA(salv_table)
                                  CHANGING  t_table      = <fo_table> ).
          RT_FCAT = cl_salv_controller_metadata=>get_lvc_fieldcatalog(
            r_columns      = salv_table->get_columns( )
            r_aggregations = salv_table->get_aggregations( ) ).
        CATCH cx_root.
      ENDTRY.

    ENDIF.

  endmethod.


  method REFRESH_ALV.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-GRID->REFRESH_TABLE_DISPLAY(
      EXPORTING
        IS_STABLE = IS_STABLE
        I_SOFT_REFRESH = space ).

    CL_GUI_CFW=>FLUSH( ).

  endmethod.


  method REFRESH_TREE.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    IF IV_COLUMNOPTIMIZATION = 'X'.
      <FS_OTREE>-TREE->COLUMN_OPTIMIZE( ).
    ENDIF.
    <FS_OTREE>-TREE->UPDATE_CALCULATIONS( ).
    <FS_OTREE>-TREE->FRONTEND_UPDATE( ).


  endmethod.


  method SET_CONTAINER_HEIGHT.

    READ TABLE MT_CONTAINER WITH KEY repid = iv_repid
                                     dynnr = iv_dynnr
                                     row   = iv_row
                                     column = iv_column
                                ASSIGNING FIELD-SYMBOL(<FS_OCONTAINER>).
    CHECK sy-subrc = 0.

    <FS_OCONTAINER>-SPLITTER->SET_ROW_HEIGHT( id = <FS_OCONTAINER>-ID
                                              HEIGHT = iv_HEIGHT ).


  endmethod.


  method SET_CONTAINER_WIDTH.

    READ TABLE MT_CONTAINER WITH KEY repid = iv_repid
                                     dynnr = iv_dynnr
                                     row   = iv_row
                                     column = iv_column
                                ASSIGNING FIELD-SYMBOL(<FS_OCONTAINER>).
    CHECK sy-subrc = 0.

    <FS_OCONTAINER>-SPLITTER->SET_COLUMN_WIDTH( id = <FS_OCONTAINER>-ID
                                                width = iv_width ).


  endmethod.


  method SET_DROP_EXTERNAL.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-GRID->DRAG_ACCEPT_FILES( IV_ACCEPT_FILES ).


  endmethod.


  method SET_EVENT_HANDLER.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.


    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    LOOP AT IO_EVENT->MT_EVENTLIST ASSIGNING FIELD-SYMBOL(<FS_EVENT>).

      IF <FS_EVENT>-FORM IS NOT INITIAL
        OR <FS_EVENT>-METHOD IS NOT INITIAL.
        CASE <FS_EVENT>-EVENT.
          WHEN 'HANDLE_DATA_CHANGED'.
            SET HANDLER IO_EVENT->HANDLE_DATA_CHANGED FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_DATA_CHANGED_FINISHED'.
            SET HANDLER IO_EVENT->HANDLE_DATA_CHANGED_FINISHED FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_DOUBLE_CLICK'.
            SET HANDLER IO_EVENT->HANDLE_DOUBLE_CLICK FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_DROP_EXTERNAL_FILES'.
            "SET_DROP_EXTERNAL 메소드 먼저 진행
            SET HANDLER IO_EVENT->HANDLE_DROP_EXTERNAL_FILES FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_HOTSPOT_CLICK'.
            SET HANDLER IO_EVENT->HANDLE_HOTSPOT_CLICK FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_ONDRAG'.
            SET HANDLER IO_EVENT->HANDLE_ONDRAG FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_ONDROPCOMPLETE'.
            SET HANDLER IO_EVENT->HANDLE_ONDROPCOMPLETE FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_ONF4'.
            SET HANDLER IO_EVENT->HANDLE_ONF4 FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_TOOLBAR'.
            SET HANDLER IO_EVENT->HANDLE_TOOLBAR FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_TOP_OF_PAGE'.
            SET HANDLER IO_EVENT->HANDLE_TOP_OF_PAGE FOR <FS_OALV>-GRID.
          WHEN 'HANDLE_USER_COMMAND'.
            SET HANDLER IO_EVENT->HANDLE_USER_COMMAND FOR <FS_OALV>-GRID.
        ENDCASE.

      ENDIF.

    ENDLOOP.


  endmethod.


  method SET_EXCLUDING.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.
    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    CASE IV_TYPE.
      WHEN '1'. "STANDARD VIEW
        <FS_OALV>-TOOLBAR_EXCLUSION = VALUE #( ( CL_GUI_ALV_GRID=>MC_FC_DETAIL     )
                            ( CL_GUI_ALV_GRID=>MC_FC_DETAIL            )
                            ( CL_GUI_ALV_GRID=>MC_FC_GRAPH             )
                            ( CL_GUI_ALV_GRID=>MC_FC_INFO              )
                            ( CL_GUI_ALV_GRID=>MC_FC_CHECK             )
                            ( CL_GUI_ALV_GRID=>MC_FC_REFRESH           )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_APPEND_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_CUT           )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY          )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_UNDO          )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE_NEW_ROW )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE         )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY_ROW      )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_DELETE_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_INSERT_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_VIEWS             )
                            ( CL_GUI_ALV_GRID=>MC_FC_PRINT             ) ).

      WHEN '2'. "NO SORT, SUM
        <FS_OALV>-TOOLBAR_EXCLUSION = VALUE #( ( CL_GUI_ALV_GRID=>MC_FC_DETAIL )
                            ( CL_GUI_ALV_GRID=>MC_FC_DETAIL            )
                            ( CL_GUI_ALV_GRID=>MC_FC_GRAPH             )
                            ( CL_GUI_ALV_GRID=>MC_FC_INFO              )
                            ( CL_GUI_ALV_GRID=>MC_FC_CHECK             )
                            ( CL_GUI_ALV_GRID=>MC_FC_REFRESH           )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_APPEND_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_CUT           )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY          )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_UNDO          )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE_NEW_ROW )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE         )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY_ROW      )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_DELETE_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_INSERT_ROW    )
                            ( CL_GUI_ALV_GRID=>MC_FC_VIEWS             )
                            ( CL_GUI_ALV_GRID=>MC_FC_PRINT             )
                            ( CL_GUI_ALV_GRID=>MC_FC_SORT_ASC          )
                            ( CL_GUI_ALV_GRID=>MC_FC_SORT_DSC          )
                            ( CL_GUI_ALV_GRID=>MC_MB_SUBTOT            )
                            ( CL_GUI_ALV_GRID=>MC_MB_SUM               ) ).

      WHEN '3'. "NO SUM
        <FS_OALV>-TOOLBAR_EXCLUSION = VALUE #( ( CL_GUI_ALV_GRID=>MC_FC_DETAIL )
                          ( CL_GUI_ALV_GRID=>MC_FC_DETAIL            )
                          ( CL_GUI_ALV_GRID=>MC_FC_GRAPH             )
                          ( CL_GUI_ALV_GRID=>MC_FC_INFO              )
                          ( CL_GUI_ALV_GRID=>MC_FC_CHECK             )
                          ( CL_GUI_ALV_GRID=>MC_FC_REFRESH           )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_APPEND_ROW    )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_CUT           )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY          )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_UNDO          )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE_NEW_ROW )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE         )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY_ROW      )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_DELETE_ROW    )
                          ( CL_GUI_ALV_GRID=>MC_FC_LOC_INSERT_ROW    )
                          ( CL_GUI_ALV_GRID=>MC_FC_VIEWS             )
                          ( CL_GUI_ALV_GRID=>MC_FC_PRINT             )
                          ( CL_GUI_ALV_GRID=>MC_FC_SORT_ASC          )
                          ( CL_GUI_ALV_GRID=>MC_FC_SORT_DSC          )
                          ( CL_GUI_ALV_GRID=>MC_MB_SUBTOT            )
                          ( CL_GUI_ALV_GRID=>MC_MB_SUM               ) ).

      WHEN '4'. "STANDARD EDIT
        <FS_OALV>-TOOLBAR_EXCLUSION = VALUE #( ( CL_GUI_ALV_GRID=>MC_FC_DETAIL     )
                           ( CL_GUI_ALV_GRID=>MC_FC_DETAIL            )
                           ( CL_GUI_ALV_GRID=>MC_FC_GRAPH             )
                           ( CL_GUI_ALV_GRID=>MC_FC_INFO              )
                           ( CL_GUI_ALV_GRID=>MC_FC_CHECK             )
*                            ( CL_GUI_ALV_GRID=>MC_FC_REFRESH           )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_APPEND_ROW    )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_CUT           )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY          )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_UNDO          )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE_NEW_ROW )
                           ( CL_GUI_ALV_GRID=>MC_FC_LOC_PASTE         )
*                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_COPY_ROW      )
*                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_DELETE_ROW    )
*                            ( CL_GUI_ALV_GRID=>MC_FC_LOC_INSERT_ROW    )
                           ( CL_GUI_ALV_GRID=>MC_FC_VIEWS             )
                           ( CL_GUI_ALV_GRID=>MC_FC_PRINT             ) ).

    ENDCASE.
  endmethod.


  method SET_F4.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-F4 = IT_F4.

  endmethod.


  method SET_FIELDCAT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    IF sy-subrc = 0.
      <FS_OALV>-FIELDCAT = IT_FCAT.
    ENDIF.


  endmethod.


  method SET_FILTER.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.


    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-FILTER = IT_FILTER.


  endmethod.


  method SET_LAYOUT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    IF sy-subrc = 0.
      <FS_OALV>-LAYOUT = IS_LAYOUT.
    ENDIF.

  endmethod.


  method SET_QUICKINFO.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-QUICKINFO = IT_QUICKINFO.


  endmethod.


  method SET_READY_FOR_INPUT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-GRID->SET_READY_FOR_INPUT(
      I_READY_FOR_INPUT = COND #( WHEN IV_INPUT = 'X'   THEN 1
                                  WHEN IV_INPUT = SPACE THEN 0 )
                                       ).


  endmethod.


  method SET_REGISTER_EVENT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    IF IV_ENTER = 'X'.
      APPEND cl_gui_alv_grid=>mc_evt_enter TO
      <FS_OALV>-REGISTER_EVENTS.

      <FS_OALV>-GRID->REGISTER_EDIT_EVENT( cl_gui_alv_grid=>mc_evt_enter ).
    ENDIF.

    IF IV_MODIFIED = 'X'.
      APPEND cl_gui_alv_grid=>mc_evt_modified TO
      <FS_OALV>-REGISTER_EVENTS.

      <FS_OALV>-GRID->REGISTER_EDIT_EVENT( cl_gui_alv_grid=>mc_evt_modified ).
    ENDIF.



  endmethod.


  method SET_SORT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    <FS_OALV>-SORT = IT_SORT.

  endmethod.


  method SET_TOP_OF_PAGE.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.


    READ TABLE MT_OALV WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OALV>).
    CHECK sy-subrc = 0.

    IF <FS_OALV>-TOPOFPAGES-HTML_VIEWER IS INITIAL.
      EO_DOCK = NEW cl_gui_docking_container(
                          repid = iv_repid
                          dynnr = iv_dynnr
                          side  = cl_gui_docking_container=>dock_at_top
                          extension = iv_size ).

      eo_html = NEW #( parent = EO_DOCK ).
      eo_document = NEW #( style = 'ALV_GRID' ).

      <FS_OALV>-TOPOFPAGES-CONTAINER = EO_DOCK.
      <FS_OALV>-TOPOFPAGES-HTML_VIEWER = eo_html.
      <FS_OALV>-TOPOFPAGES-DD_DOCUMENT = eo_document.
    ENDIF.






  endmethod.


  method SET_TREE_ADD_NODE.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    <FS_OTREE>-TREE->ADD_NODE(
      EXPORTING I_RELAT_NODE_KEY = IV_RELAT_NODE_KEY
                I_RELATIONSHIP   = IV_RELATIONSHIP
                I_NODE_TEXT      = IV_NODE_TEXT
                IS_OUTTAB_LINE   = IS_OUTTAB_LINE
                IS_NODE_LAYOUT   = IS_NODE_LAYOUT
                IT_ITEM_LAYOUT   = IT_ITEM_LAYOUT
      IMPORTING E_NEW_NODE_KEY   = RV_NEW_NODE_KEY ).
  endmethod.


  method SET_TREE_EVENT_HANDLER.
    DATA : lt_events TYPE cntl_simple_events.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    <FS_OTREE>-TREE->GET_REGISTERED_EVENTS( IMPORTING events = lt_events ).

    LOOP AT IO_EVENT->MT_EVENTLIST ASSIGNING FIELD-SYMBOL(<FS_EVENT>).

      IF <FS_EVENT>-FORM IS NOT INITIAL
        OR <FS_EVENT>-METHOD IS NOT INITIAL.
        CASE <FS_EVENT>-EVENT.
          WHEN 'HANDLE_NODE_DOUBLE_CLICK'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>eventid_node_double_click TRANSPORTING NO FIELDS.
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>eventid_node_double_click ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_NODE_DOUBLE_CLICK FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_CHECKBOX_CHANGE'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_CHECKBOX_CHANGE TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_CHECKBOX_CHANGE ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_CHECKBOX_CHANGE FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_EXPAND_NC'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_EXPAND_NO_CHILDREN TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_EXPAND_NO_CHILDREN ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_EXPAND_NC FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_HEADER_CLICK'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_HEADER_CLICK TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_HEADER_CLICK ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_HEADER_CLICK FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ITEM_CONTEXT_MENU_RQ'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>eventid_item_context_menu_req TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>eventid_item_context_menu_req ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_ITEM_CONTEXT_MENU_RQ FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ITEM_CONTEXT_MENU_SEL'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_HEADER_CONTEXT_MEN_REQ TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_HEADER_CONTEXT_MEN_REQ ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_ITEM_CONTEXT_MENU_SEL FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ITEM_DOUBLE_CLICK'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>eventid_item_double_click TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>eventid_item_double_click ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_ITEM_DOUBLE_CLICK FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ITEM_KEYPRESS'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_ITEM_KEYPRESS TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_ITEM_KEYPRESS ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_ITEM_KEYPRESS FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_LINK_CLICK'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_LINK_CLICK TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_LINK_CLICK ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_LINK_CLICK FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_NODE_CONTEXT_MENU_RQ'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>eventid_node_context_menu_req TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>eventid_node_context_menu_req ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_NODE_CONTEXT_MENU_RQ FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_NODE_CONTEXT_MENU_SEL'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_NODE_CONTEXT_MENU_REQ TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_NODE_CONTEXT_MENU_REQ ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_NODE_CONTEXT_MENU_SEL FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_NODE_KEYPRESS'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>EVENTID_NODE_KEYPRESS TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>EVENTID_NODE_KEYPRESS ) TO lt_events.
            ENDIF.
            SET HANDLER IO_EVENT->HANDLE_NODE_KEYPRESS FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DRAG'.
            SET HANDLER IO_EVENT->HANDLE_ON_DRAG FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DRAG_MULTIPLE'.
            SET HANDLER IO_EVENT->HANDLE_ON_DRAG_MULTIPLE FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DROP'.
            SET HANDLER IO_EVENT->HANDLE_ON_DROP FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DROP_COMPLETE'.
            SET HANDLER IO_EVENT->HANDLE_ON_DROP_COMPLETE FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DROP_COMPLETE_MULT'.
            SET HANDLER IO_EVENT->HANDLE_ON_DROP_COMPLETE_MULT FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DROP_EXTERNAL_FILES'.
            SET HANDLER IO_EVENT->HANDLE_ON_DROP_EXTERNAL_FILES FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_ON_DROP_GET_FLAVOR'.
            SET HANDLER IO_EVENT->HANDLE_ON_DROP_GET_FLAVOR FOR <FS_OTREE>-TREE.
          WHEN 'HANDLE_SELECTION_CHANGED'.
            READ TABLE lt_events WITH KEY eventid = cl_gui_column_tree=>eventid_selection_changed TRANSPORTING NO FIELDS..
            IF sy-subrc <> 0.
              APPEND VALUE #( eventid = cl_gui_column_tree=>eventid_selection_changed ) TO lt_events.
            ENDIF.

            SET HANDLER IO_EVENT->HANDLE_SELECTION_CHANGED FOR <FS_OTREE>-TREE.
        ENDCASE.

      ENDIF.

    ENDLOOP.

    <FS_OTREE>-TREE->SET_REGISTERED_EVENTS( EXPORTING events = lt_events ).


  endmethod.


  method SET_TREE_EXCLUDING.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.


    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                  dynnr = iv_dynnr
                                  row   = LV_ROW
                                  column = LV_COLUMN
                                  ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    CASE IV_TYPE.
      WHEN '1'. "STANDARD VIEW
        <FS_OTREE>-TOOLBAR_EXCLUSION = VALUE #(
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE             )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_AVG              )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_MAX             )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_MIN           )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_SUM    )
                            ( CL_GUI_ALV_TREE=>MC_FC_GRAPHICS           )
                            ( CL_GUI_ALV_TREE=>MC_FC_HELP          )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_BACK          )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_BACK_ALL )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_PREV         )
                            ( CL_GUI_ALV_TREE=>MC_FC_F4      )
                            ( CL_GUI_ALV_TREE=>MC_FC_SETTOP      )
                            ).


      WHEN '2'. "ALL EXCLUDING
        <FS_OTREE>-TOOLBAR_EXCLUSION = VALUE #(
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_AVG )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_MAX )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_MIN )
                            ( CL_GUI_ALV_TREE=>MC_FC_CALCULATE_SUM )
                            ( CL_GUI_ALV_TREE=>MC_FC_COLLAPSE )
                            ( CL_GUI_ALV_TREE=>MC_FC_COL_INVISIBLE )
                            ( CL_GUI_ALV_TREE=>MC_FC_COL_OPTIMIZE )
                            ( CL_GUI_ALV_TREE=>MC_FC_CURRENT_VARIANT )
                            ( CL_GUI_ALV_TREE=>MC_FC_DETAIL )
                            ( CL_GUI_ALV_TREE=>MC_FC_EXPAND )
                            ( CL_GUI_ALV_TREE=>MC_FC_FIND )
                            ( CL_GUI_ALV_TREE=>MC_FC_GRAPHICS )
                            ( CL_GUI_ALV_TREE=>MC_FC_HELP )
                            ( CL_GUI_ALV_TREE=>MC_FC_LOAD_VARIANT )
                            ( CL_GUI_ALV_TREE=>MC_FC_MAINTAIN_VARIANT )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_BACK )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_BACK_ALL )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_PREV )
                            ( CL_GUI_ALV_TREE=>MC_FC_PRINT_PREV_ALL )
                            ( CL_GUI_ALV_TREE=>MC_FC_SAVE_VARIANT )
                            ( CL_GUI_ALV_TREE=>MC_FC_SETTOP )
                            ( CL_GUI_ALV_TREE=>MC_FC_FIND_MORE )
                                               ).


    ENDCASE.

  endmethod.


  method SET_TREE_FIELDCAT.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                dynnr = iv_dynnr
                                row   = LV_ROW
                                column = LV_COLUMN
                                ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    IF sy-subrc = 0.
      <FS_OTREE>-FIELDCAT = IT_FCAT.
    ENDIF.



  endmethod.


  method SET_TREE_FILTER.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    <FS_OTREE>-FILTER = IT_FILTER.

  endmethod.


  method SET_TREE_HEADER.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    <FS_OTREE>-HIERARCHY_HEADER = IS_HIERARCHY_HEADER.
    <FS_OTREE>-LIST_COMMENTARY  = IT_LIST_COMMENTARY.
    <FS_OTREE>-LOGO             = IV_LOGO.

  endmethod.


  method SET_TREE_QUICKINFO.

    DATA : LV_ROW TYPE I,
           LV_COLUMN TYPE I.

    IF IV_ROW IS NOT INITIAL.
      LV_ROW = IV_ROW.
    ELSE.
      LV_ROW = MV_ROW.
    ENDIF.

    IF IV_COLUMN IS NOT INITIAL.
      LV_COLUMN = IV_COLUMN.
    ELSE.
      LV_COLUMN = MV_COLUMN.
    ENDIF.

    READ TABLE MT_OTREE WITH KEY repid = iv_repid
                                 dynnr = iv_dynnr
                                 row   = LV_ROW
                                 column = LV_COLUMN
                                 ASSIGNING FIELD-SYMBOL(<FS_OTREE>).
    CHECK sy-subrc = 0.

    <FS_OTREE>-QUICKINFO = IT_QINFO.

  endmethod.


  method ZIF_S4SAP_CM~CREATE_DYNAMIC_TABLE.

    DATA : LT_FIELDCAT TYPE LVC_T_FCAT,
           LO_TABLE TYPE REF TO DATA.

    IF IV_TABNAME IS SUPPLIED.

      CALL FUNCTION 'LVC_FIELDCATALOG_MERGE'
        EXPORTING
          I_STRUCTURE_NAME = IV_TABNAME
        CHANGING
          CT_FIELDCAT      = LT_FIELDCAT
        EXCEPTIONS
          INCONSISTENT_INTERFACE = 1
          OTHERS = 2.

    ELSE.

      LT_FIELDCAT = IT_FIELDCAT.

    ENDIF.

    CALL METHOD CL_ALV_TABLE_CREATE=>CREATE_DYNAMIC_TABLE
      EXPORTING
        IT_FIELDCATALOG = LT_FIELDCAT
      IMPORTING
        EP_TABLE        = LO_TABLE.

    RO_TABLE = LO_TABLE.

  endmethod.


  method ZIF_S4SAP_CM~SALV_AFTER_SALV_FUNCTION.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_BEFORE_SALV_FUNCTION.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_END_OF_PAGE.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_GET_SELECTED_ROWS.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_ON_DOUBLE_CLICK.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_ON_FUNCTION_CLICK.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_ON_LINK_CLICK.
    " Use SALV classes for this method.
  endmethod.


  method ZIF_S4SAP_CM~SALV_TOP_OF_PAGE.
    " Use SALV classes for this method.
  endmethod.
ENDCLASS.
